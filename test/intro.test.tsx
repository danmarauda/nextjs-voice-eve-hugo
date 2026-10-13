// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { useConvexAuth } from "convex/react";
import { Hero } from "@/components/landing/Hero";

vi.mock("convex/react", () => ({ useConvexAuth: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

describe("intro entry destinations", () => {
  test.each([
    { name: "signed-out visitor", initialAuthed: false, isLoading: false, isAuthenticated: false, href: "/sign-in?next=%2Fchat" },
    { name: "authenticated visitor", initialAuthed: false, isLoading: false, isAuthenticated: true, href: "/chat" },
    { name: "server session during hydration", initialAuthed: true, isLoading: true, isAuthenticated: false, href: "/chat" },
    { name: "signed-out server snapshot during hydration", initialAuthed: false, isLoading: true, isAuthenticated: false, href: "/sign-in?next=%2Fchat" },
    { name: "expired server session after client resolution", initialAuthed: true, isLoading: false, isAuthenticated: false, href: "/sign-in?next=%2Fchat" },
  ])("uses the correct destination for $name", ({ initialAuthed, isLoading, isAuthenticated, href }) => {
    vi.mocked(useConvexAuth).mockReturnValue({ isLoading, isAuthenticated, isRefreshing: false });
    const html = renderToStaticMarkup(<Hero artwork={<span>Artwork</span>} initialAuthed={initialAuthed} />);

    expect(html).toContain(`href="${href}"`);
    expect(html).toContain("Skip intro");
    expect(html).toContain('data-intro-state="playing"');
    expect(html).toContain('role="status"');
    expect(html).not.toContain("Meet ALIAS");
    expect(html).not.toContain("THE COMMAND SURFACE");
    expect(html).not.toContain("POWERED BY");
  });
});
