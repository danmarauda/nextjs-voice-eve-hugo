import { NextResponse } from "next/server";
import {
  streamText,
  stepCountIs,
  type ModelMessage,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { fetchQuery, fetchMutation, authToken } from "@/lib/convex-server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  buildHugoGatewayProviderOptions,
  buildHugoSystemPrompt,
  buildHugoTools,
  getHugoTextCallSettings,
  getTextModel,
  isAiConfigured,
} from "@/lib/ai";
import { hugoTelemetry, track } from "@/lib/telemetry";
import { isTextLimitReached } from "@/lib/usage";
import { rateLimit } from "@/lib/rate-limit";
import { REALTIME_TOKEN_RATE } from "@/lib/constants";

export const maxDuration = 60;

const MAX_USER_MESSAGE_CHARS = 4000;

const Body = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        parts: z.array(z.object({ type: z.string() }).passthrough()).max(50).optional(),
      }).passthrough(),
    )
    .min(1)
    .max(200),
  conversationId: z.string().min(1).max(64).optional(),
});

/**
 * POST /api/chat (PRD 5.5, 5.11)
 *
 * Authenticated, streaming. Same Hugo identity + tools as voice. Persists the
 * user turn and the assistant turn to Convex, enforces the daily text-message
 * limit, and emits a usage event. Streams AI SDK v7 UI messages back to useChat.
 */
export async function POST(req: Request) {
  const token = await authToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const messages = parsed.data.messages as unknown as UIMessage[];
  const incomingConversationId = parsed.data.conversationId;

  // Only the newest user turn is taken from the client. Prior history always
  // comes from Convex, so a client cannot inject forged assistant, system, or
  // tool turns into the model context.
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userText = lastUser ? extractText(lastUser) : "";
  if (!userText || userText.length > MAX_USER_MESSAGE_CHARS) {
    return NextResponse.json(
      { error: `Messages must be 1–${MAX_USER_MESSAGE_CHARS} characters.` },
      { status: 400 },
    );
  }

  const me = await fetchQuery(api.users.currentUser, {}, { token });
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const burstLimit = rateLimit(
    `chat:${me._id}`,
    REALTIME_TOKEN_RATE.max,
    REALTIME_TOKEN_RATE.windowMs,
  );
  if (!burstLimit.ok) {
    track("chat_rate_limited", { userId: me._id });
    return NextResponse.json(
      { error: "Slow down a moment." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(burstLimit.retryAfterMs / 1000)),
        },
      },
    );
  }

  // Resuming is owner-only, even for admins, and is checked before any spend.
  if (incomingConversationId) {
    const convo = await fetchQuery(
      api.conversations.get,
      { conversationId: incomingConversationId as Id<"conversations"> },
      { token },
    ).catch(() => null);
    if (!convo || convo.userId !== me._id) {
      track("chat_conversation_denied", { userId: me._id });
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }
  }

  // Enforce daily text-message limit.
  const usage = await fetchQuery(api.usageEvents.todayForUser, {}, { token });
  if (
    isTextLimitReached(
      { textMessages: usage.textMessages, voiceMinutes: usage.voiceMinutes },
      usage.limits,
    )
  ) {
    return NextResponse.json(
      { error: "Daily message limit reached. Come back tomorrow." },
      { status: 429 },
    );
  }

  // Runtime config from admin Settings (model + maintenance mode).
  const runtime = await fetchQuery(api.settings.getRuntime, {}, { token }).catch(
    () => null,
  );
  if (runtime?.maintenanceMode && me.role !== "admin") {
    return NextResponse.json(
      { error: "Hugo is in maintenance mode. Please try again shortly." },
      { status: 503 },
    );
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI is not configured. Set AI_GATEWAY_API_KEY to chat with Hugo." },
      { status: 503 },
    );
  }

  // Resolve or create the conversation.
  let conversationId = incomingConversationId as Id<"conversations"> | undefined;
  const isResume = !!conversationId;
  if (!conversationId) {
    conversationId = await fetchMutation(
      api.conversations.create,
      { title: "New conversation", mode: "text" },
      { token },
    );
  } else {
    // A voice conversation continuing in text becomes "mixed".
    await fetchMutation(
      api.conversations.continueAsText,
      { conversationId },
      { token },
    ).catch(() => {});
  }

  // Build the model context. On resume, the server is authoritative: load the
  // stored history (BEFORE persisting the new turn) and append the new user
  // message, so context is never lost and never duplicated regardless of what
  // the client sends (PRD 5.5 "continue the same session in text chat").
  let modelMessages: ModelMessage[];
  if (isResume) {
    const prior = await fetchQuery(
      api.messages.list,
      { conversationId, limit: 200 },
      { token },
    ).catch(() => []);
    const priorModel: ModelMessage[] = prior
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content || m.transcript || "",
      }))
      .filter((m) => m.content.length > 0);
    modelMessages = [...priorModel, { role: "user", content: userText }];
  } else {
    modelMessages = [{ role: "user", content: userText }];
  }

  // Persist the latest user turn (after reading prior history to avoid dupes).
  await fetchMutation(
    api.messages.append,
    { conversationId, role: "user", modality: "text", content: userText },
    { token },
  ).catch(() => {});

  // Per-user memory + identity for the system prompt.
  const memories = await fetchQuery(api.memories.listOwn, {}, { token }).catch(
    () => [] as { key: string; value: string }[],
  );

  const system = buildHugoSystemPrompt({
    mode: "text",
    userName: me.name,
    role: me.role,
    memories: memories.map((m) => ({ key: m.key, value: m.value })),
  });

  const startedAt = Date.now();
  const model = getTextModel(runtime?.defaultTextModel);
  const callSettings = getHugoTextCallSettings("chat");

  try {
    const result = streamText({
      model,
      system,
      messages: modelMessages,
      tools: buildHugoTools({ token, conversationId }),
      stopWhen: stepCountIs(5),
      maxOutputTokens: callSettings.maxOutputTokens,
      maxRetries: callSettings.maxRetries,
      timeout: callSettings.timeoutMs,
      providerOptions: buildHugoGatewayProviderOptions({
        feature: "chat",
        mode: "text",
        userId: me._id,
        conversationId,
      }),
      experimental_telemetry: hugoTelemetry("hugo.chat", {
        conversationId,
        userId: me._id,
      }),
      onFinish: async ({ text, usage: modelUsage }) => {
        try {
          if (text) {
            await fetchMutation(
              api.messages.append,
              {
                conversationId: conversationId!,
                role: "assistant",
                modality: "text",
                content: text,
              },
              { token },
            );
          }
          await fetchMutation(
            api.usageEvents.log,
            {
              type: "text_message",
              conversationId,
              provider: "ai-gateway",
              model,
              inputTokens: modelUsage?.inputTokens,
              outputTokens: modelUsage?.outputTokens,
              latencyMs: Date.now() - startedAt,
            },
            { token },
          );
          track("assistant_response_completed", {
            conversationId,
            inputTokens: modelUsage?.inputTokens ?? null,
            latencyMs: Date.now() - startedAt,
            model,
            outputTokens: modelUsage?.outputTokens ?? null,
            userId: me._id,
          });
        } catch {
          /* persistence is best-effort; the stream already succeeded */
        }
      },
    });

    return result.toUIMessageStreamResponse({
      headers: { "x-conversation-id": conversationId },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate response";
    track("assistant_response_failed", {
      conversationId,
      error: message,
      model,
      userId: me._id,
    });
    return NextResponse.json(
      { error: "Hugo couldn't respond right now. Please try again." },
      { status: 502 },
    );
  }
}

/** Extract concatenated text from a UIMessage's parts. */
function extractText(message: UIMessage): string {
  return (message.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();
}
