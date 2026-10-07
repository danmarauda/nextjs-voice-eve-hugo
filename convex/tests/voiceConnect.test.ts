/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const modules = import.meta.glob("../**/*.ts");

async function seedUser(
  t: ReturnType<typeof convexTest>,
  email: string,
  role: "user" | "admin" = "user",
): Promise<Id<"users">> {
  const now = Date.now();
  return await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      role,
      status: "active",
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
      preferences: { theme: "dark" },
    }),
  );
}

function as(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: `${userId}|test-session` });
}

async function startSession(
  t: ReturnType<typeof convexTest>,
  owner: Id<"users">,
): Promise<Id<"voiceSessions">> {
  const conversationId = await as(t, owner).mutation(api.conversations.create, {
    title: "Voice session",
    mode: "voice",
  });
  return await as(t, owner).mutation(api.voiceSessions.create, {
    conversationId,
    provider: "ai-gateway",
    model: "openai/gpt-realtime",
    voice: "alloy",
  });
}

describe("realtime connect eligibility", () => {
  test("the owner can connect to an open session with its recorded config", async () => {
    const t = convexTest(schema, modules);
    const owner = await seedUser(t, "owner@example.com");
    const sessionId = await startSession(t, owner);
    const result = await as(t, owner).query(api.voiceSessions.getForConnect, {
      voiceSessionId: sessionId,
    });
    expect(result).toEqual({
      voiceSessionId: sessionId,
      model: "openai/gpt-realtime",
      voice: "alloy",
    });
  });

  test("other users and admins cannot connect to someone else's session", async () => {
    const t = convexTest(schema, modules);
    const owner = await seedUser(t, "owner@example.com");
    const other = await seedUser(t, "other@example.com");
    const admin = await seedUser(t, "admin@example.com", "admin");
    const sessionId = await startSession(t, owner);
    for (const caller of [other, admin]) {
      await expect(
        as(t, caller).query(api.voiceSessions.getForConnect, {
          voiceSessionId: sessionId,
        }),
      ).resolves.toBeNull();
    }
  });

  test("ended sessions, malformed IDs, and guests are refused", async () => {
    const t = convexTest(schema, modules);
    const owner = await seedUser(t, "owner@example.com");
    const sessionId = await startSession(t, owner);
    await as(t, owner).mutation(api.voiceSessions.end, { voiceSessionId: sessionId });
    await expect(
      as(t, owner).query(api.voiceSessions.getForConnect, { voiceSessionId: sessionId }),
    ).resolves.toBeNull();
    await expect(
      as(t, owner).query(api.voiceSessions.getForConnect, { voiceSessionId: "not-an-id" }),
    ).resolves.toBeNull();
    await expect(
      t.query(api.voiceSessions.getForConnect, { voiceSessionId: sessionId }),
    ).rejects.toThrow();
  });
});
