import { describe, expect, test } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  test.each([
    ["/chat", "/chat"],
    ["/conversations/abc?tab=history#latest", "/conversations/abc?tab=history#latest"],
    ["/settings", "/settings"],
  ])("keeps app-relative destination %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  test.each([
    [null],
    [undefined],
    [""],
    ["https://evil.example/chat"],
    ["//evil.example/chat"],
    ["/\\evil.example"],
    ["\\\\evil.example"],
    ["/%0d%0a"],
    ["/chat\nLocation: https://evil.example"],
    ["javascript:alert(1)"],
    ["chat"],
    ["/sign-in"],
    ["/sign-in?next=/chat"],
    ["/sign-up/"],
  ])("rejects unsafe or looping destination %s", (input) => {
    expect(safeRedirectPath(input)).toBe("/chat");
  });

  test("uses the supplied fallback", () => {
    expect(safeRedirectPath("//evil.example", "/settings")).toBe("/settings");
  });
});
