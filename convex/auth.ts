import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { passwordProblem } from "./model/passwordPolicy";

/**
 * Hugo authentication (PRD 5.1).
 *
 * Self-contained email + password auth via Convex Auth. Every new account is a
 * `user`. Email ownership is not verified, so a submitted address must never
 * grant privileges; the first admin is promoted by an operator through the
 * internal `admin.bootstrapAdmin` mutation.
 */

const DAILY_VOICE_MINUTES_LIMIT = Number(
  process.env.DAILY_VOICE_MINUTES_LIMIT ?? 30,
);
const DAILY_TEXT_MESSAGES_LIMIT = Number(
  process.env.DAILY_TEXT_MESSAGES_LIMIT ?? 200,
);

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
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
      validatePasswordRequirements(password) {
        const problem = passwordProblem(password);
        if (problem) throw new ConvexError({ code: "INVALID_PASSWORD", message: problem });
      },
    }),
  ],
  callbacks: {
    /**
     * Owns user-document creation/update. New accounts get Hugo profile
     * defaults and the `user` role. Existing accounts just refresh activity
     * timestamps; their role is never changed here.
     */
    async createOrUpdateUser(ctx, { existingUserId, profile }) {
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

      return await ctx.db.insert("users", {
        email,
        name,
        image,
        role: "user",
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
});
