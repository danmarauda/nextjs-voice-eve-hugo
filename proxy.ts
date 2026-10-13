import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { getAuthRedirect } from "@/lib/auth-redirect";

/**
 * Next.js 16 proxy (formerly middleware). Provides route-level auth protection
 * for app + admin routes (PRD 5.12). Unauthenticated users hitting a protected
 * route are redirected to sign-in. Admin authorization is additionally enforced
 * server-side in the /admin layout and in every admin Convex function — this
 * proxy is a first gate, not the only one (PRD 5.17).
 */

const isSignInPage = createRouteMatcher(["/sign-in", "/sign-up"]);
const isProtectedRoute = createRouteMatcher([
  "/chat(.*)",
  "/workspace(.*)",
  "/conversations(.*)",
  "/settings(.*)",
  "/admin(.*)",
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authed = await convexAuth.isAuthenticated();

  if (isSignInPage(request) && authed) {
    const destination = request.nextUrl.searchParams.get("oauth") === "google"
      ? getAuthRedirect(request.nextUrl.searchParams.get("next"))
      : "/";
    return nextjsMiddlewareRedirect(request, destination);
  }

  if (isProtectedRoute(request) && !authed) {
    const next = encodeURIComponent(request.nextUrl.pathname);
    return nextjsMiddlewareRedirect(request, `/sign-in?next=${next}`);
  }
});

export const config = {
  // Run on everything except static assets and image optimization.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
