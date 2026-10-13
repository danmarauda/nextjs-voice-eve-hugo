import { describe, expect, test } from "vitest";
import { getAuthRedirect } from "@/lib/auth-redirect";

describe("authentication return destinations", () => {
  test.each([null, "", "https://evil.example", "//evil.example", "/\\evil.example", "/\nevil.example", "javascript:alert(1)", "/sign-in", "/sign-up", "/chat/../sign-in"])("rejects unsafe or looping destination %s", (value) => {
    expect(getAuthRedirect(value)).toBe("/chat");
  });

  test.each(["/chat", "/workspace?document=123", "/settings#profile", "/conversations/123"])("preserves local destination %s", (value) => {
    expect(getAuthRedirect(value)).toBe(value);
  });
});
