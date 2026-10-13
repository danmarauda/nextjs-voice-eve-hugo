import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, type ConvexAuthConfig } from "@convex-dev/auth/server";

/**
 * Hugo authentication (PRD 5.1).
 *
 * Email/password and Google OAuth use the same Convex Auth session lifecycle.
 * New admin accounts require a Google-verified default-admin email. Existing
 * roles are preserved, and accounts are never linked by matching email alone.
 */

const DEFAULT_ADMIN_EMAIL = (
  process.env.DEFAULT_ADMIN_EMAIL ?? "solsymbaiex@gmail.com"
).toLowerCase();
const DAILY_VOICE_MINUTES_LIMIT = Number(
  process.env.DAILY_VOICE_MINUTES_LIMIT ?? 30,
);
const DAILY_TEXT_MESSAGES_LIMIT = Number(
  process.env.DAILY_TEXT_MESSAGES_LIMIT ?? 200,
);

export const authConfig = {
  providers: [
    Google({
      allowDangerousEmailAccountLinking: false,
      checks: ["pkce", "state"],
      profile(profile) {
        if (profile.email_verified !== true || !profile.email) {
          throw new Error("Google sign-in requires a verified email address.");
        }
        return {
          id: profile.sub,
          email: profile.email.toLowerCase().trim(),
          emailVerified: true,
          name: profile.name,
          image: profile.picture,
        };
      },
    }),
    Password({
      // Normalize email and carry an optional display name from the sign-up form.
      profile(params) {
        const email = String(params.email ?? "").toLowerCase().trim();
        // Build an index-signature-safe object — the provider profile type
        // forbids `undefined` values, so only attach `name` when present.
        const result: Record<string, string> & { email: string } = { email };
        if (typeof params.name === "string" && params.name.trim().length > 0) {
          result.name = params.name.trim();
        }
        return result;
      },
    }),
  ],
  callbacks: {
    /**
     * Owns user-document creation/update. New accounts get Hugo profile
     * defaults; only Google's verified default-admin email can create an admin.
     * Existing accounts retain their IDs, roles, ownership and preferences.
     */
    async createOrUpdateUser(ctx, { existingUserId, profile, type, provider }) {
      const verifiedGoogleEmail =
        type === "oauth" && provider.id === "google" && profile.emailVerified === true;
      if (type === "oauth" && provider.id === "google" && !verifiedGoogleEmail) {
        throw new Error("Google sign-in requires a verified email address.");
      }
      const now = Date.now();
      const email =
        typeof profile.email === "string"
          ? profile.email.toLowerCase().trim()
          : undefined;
      const name =
        typeof profile.name === "string" ? profile.name : undefined;
      const image =
        typeof (profile as { image?: unknown }).image === "string"
          ? (profile as { image?: string }).image
          : undefined;

      if (existingUserId) {
        const patch: Record<string, unknown> = {
          lastSeenAt: now,
          updatedAt: now,
        };
        if (name) patch.name = name;
        if (image) patch.image = image;
        await ctx.db.patch(existingUserId, patch);
        return existingUserId;
      }

      const role =
        verifiedGoogleEmail && email === DEFAULT_ADMIN_EMAIL ? "admin" : "user";

      return await ctx.db.insert("users", {
        email,
        ...(verifiedGoogleEmail ? { emailVerificationTime: now } : {}),
        name,
        image,
        role,
        status: "active",
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
        preferences: { theme: "dark" },
        usageLimits: {
          dailyVoiceMinutes: DAILY_VOICE_MINUTES_LIMIT,
          dailyTextMessages: DAILY_TEXT_MESSAGES_LIMIT,
        },
      });
    },
  },
} satisfies ConvexAuthConfig;

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth(authConfig);
