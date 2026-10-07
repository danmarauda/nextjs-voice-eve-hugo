export const DEFAULT_AUTHENTICATED_PATH = "/chat";

const AUTH_PATHS = ["/sign-in", "/sign-up"];
const PLACEHOLDER_ORIGIN = "https://hugo.invalid";

/**
 * Returns a same-origin, app-relative destination for post-auth navigation,
 * or the fallback when the candidate could leave the site or loop back into
 * the auth screens.
 */
export function safeRedirectPath(
  candidate: string | null | undefined,
  fallback: string = DEFAULT_AUTHENTICATED_PATH,
): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  const unsafeCharacter = /[\\\u0000-\u001f\u007f]/;
  if (unsafeCharacter.test(candidate)) return fallback;
  try {
    if (unsafeCharacter.test(decodeURIComponent(candidate))) return fallback;
  } catch {
    return fallback;
  }

  let url: URL;
  try {
    url = new URL(candidate, PLACEHOLDER_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;

  const isAuthPath = AUTH_PATHS.some(
    (path) => url.pathname === path || url.pathname.startsWith(`${path}/`),
  );
  if (isAuthPath) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}
