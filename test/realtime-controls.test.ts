// @vitest-environment node
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { HugoSessionControls } from "@/components/hugo/HugoSessionControls";

type ControlsProps = ComponentProps<typeof HugoSessionControls>;

function renderControls(status: ControlsProps["status"]) {
  const markup = renderToStaticMarkup(
    createElement(HugoSessionControls, {
      status,
      orbState: "idle",
      isCapturing: false,
      onConnect: vi.fn(),
      onDisconnect: vi.fn(),
      onToggleMic: vi.fn(),
      onInterrupt: vi.fn(),
      onSwitchToText: vi.fn(),
    }),
  );
  const buttons = Array.from(markup.matchAll(/<button\b[^>]*>/g), ([tag]) => tag);
  return {
    markup,
    button: (label: string) => buttons.find((tag) => tag.includes(`aria-label="${label}"`)),
  };
}

describe("voice session connection lifecycle", () => {
  test("closing prevents reconnect and microphone capture while preserving text fallback", () => {
    const controls = renderControls("closing");
    expect(controls.markup).toContain("Disconnecting");
    expect(controls.button("Connect voice session")).toBeUndefined();
    expect(controls.button("End voice session")).toBeUndefined();
    expect(controls.button("Unmute microphone")).toContain('disabled=""');
    expect(controls.button("Interrupt Hugo")).toContain('disabled=""');
    expect(controls.button("Switch to text chat")).toBeDefined();
    expect(controls.button("Switch to text chat")).not.toContain('disabled=""');
  });

  test("connecting keeps the microphone disabled", () => {
    const controls = renderControls("connecting");
    expect(controls.button("Connect voice session")).toBeUndefined();
    expect(controls.button("Unmute microphone")).toContain('disabled=""');
    expect(controls.button("End voice session")).toBeDefined();
  });

  test("connected enables the microphone and hang-up controls", () => {
    const controls = renderControls("connected");
    expect(controls.button("Unmute microphone")).toBeDefined();
    expect(controls.button("Unmute microphone")).not.toContain('disabled=""');
    expect(controls.button("End voice session")).toBeDefined();
  });

  test.each(["disconnected", "error"] as const)("%s permits reconnect", (status) => {
    const controls = renderControls(status);
    expect(controls.button("Connect voice session")).toBeDefined();
    expect(controls.button("Connect voice session")).not.toContain('disabled=""');
    expect(controls.button("Unmute microphone")).toBeUndefined();
  });
});
