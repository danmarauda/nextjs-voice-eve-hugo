export function getAuthRedirect(next: string | null): string {
  if (!next?.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(next)) {
    return "/chat";
  }

  try {
    const base = "https://auth.invalid";
    const url = new URL(next, base);
    if (url.origin !== base || ["/sign-in", "/sign-up"].includes(url.pathname)) {
      return "/chat";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/chat";
  }
}
