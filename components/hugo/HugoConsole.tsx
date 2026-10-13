"use client";

import { useCallback, useState } from "react";
import { AudioLines, MessageSquare } from "lucide-react";
import { Tabs } from "@heroui/react";
import { HugoVoicePanel } from "@/components/hugo/HugoVoicePanel";
import { HugoChatPanel } from "@/components/hugo/HugoChatPanel";
import { cn } from "@/lib/utils";

/**
 * HugoConsole — the combined voice + text surface (PRD 5.5).
 *
 * The premium framed shell used by the chat page and (for authed users) the
 * landing. A segmented control toggles between Voice (orb hero) and Text modes;
 * voice failures auto-fall back to text. Mode lives in local state and defaults
 * to "voice".
 */

type Mode = "voice" | "text";

export function HugoConsole({
  conversationId,
  initialPrompt,
  className,
}: {
  conversationId?: string;
  initialPrompt?: string;
  className?: string;
}) {
  const [mode, setMode] = useState<Mode>(initialPrompt ? "text" : "voice");

  const fallbackToText = useCallback(() => setMode("text"), []);

  return (
    <section
      className={cn(
        "panel relative flex flex-col gap-5 overflow-hidden rounded-lg p-5 sm:p-6",
        className,
      )}
      aria-label="ALIAS BDO console"
    >
      {/* Ambient grid backdrop */}
      <div className="bg-grid bg-grid-fade pointer-events-none absolute inset-0 -z-10 opacity-50" />

      {/* Segmented mode control */}
      <Tabs
        selectedKey={mode}
        onSelectionChange={(key) => {
          if (key === "voice" || key === "text") setMode(key);
        }}
        keyboardActivation="manual"
        className="w-full gap-5"
      >
        <Tabs.ListContainer className="w-full max-w-xs self-center">
          <Tabs.List aria-label="Conversation mode" className="glass-tabs w-full">
            <Tabs.Tab id="voice" className="glass-tab gap-2">
              <AudioLines aria-hidden className="size-4 stroke-[1.5]" />
              Voice
            </Tabs.Tab>
            <Tabs.Tab id="text" className="glass-tab gap-2">
              <MessageSquare aria-hidden className="size-4 stroke-[1.5]" />
              Text
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* Panels — inactive content unmounts so voice capture cannot continue offscreen. */}
        <Tabs.Panel id="voice" className="p-0">
          {mode === "voice" && (
            <HugoVoicePanel
              conversationId={conversationId}
              onFallbackToText={fallbackToText}
            />
          )}
        </Tabs.Panel>
        <Tabs.Panel id="text" className="min-h-[24rem] p-0">
          {mode === "text" && (
            <HugoChatPanel conversationId={conversationId} initialPrompt={initialPrompt} className="min-h-[24rem]" />
          )}
        </Tabs.Panel>
      </Tabs>
    </section>
  );
}
