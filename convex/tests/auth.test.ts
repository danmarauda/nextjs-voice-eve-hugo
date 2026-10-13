/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { authConfig } from "../auth";
import schema from "../schema";
import { api } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");
const createOrUpdateUser = authConfig.callbacks.createOrUpdateUser;
const google = { id: "google", type: "oidc" as const, name: "Google" };
const password = { id: "password", type: "credentials" as const, authorize: async () => null };
const adminEmail = (process.env.DEFAULT_ADMIN_EMAIL ?? "solsymbaiex@gmail.com").toLowerCase();

function createGoogleUser(t: ReturnType<typeof convexTest>, email = "ada@example.com") {
  return t.run((ctx) => createOrUpdateUser(ctx, {
    existingUserId: null,
    type: "oauth",
    provider: google,
    profile: { email, emailVerified: true, name: "Ada", image: "https://example.com/avatar.png" },
  }));
}

describe("Google account security", () => {
  test("creates a verified Google user with Hugo defaults", async () => {
    const t = convexTest(schema, modules);
    const id = await createGoogleUser(t, "ADA@EXAMPLE.COM");
    const user = await t.run((ctx) => ctx.db.get(id));
    expect(user).toMatchObject({ email: "ada@example.com", name: "Ada", role: "user", status: "active", preferences: { theme: "dark" } });
    expect(user?.emailVerificationTime).toBeTypeOf("number");
    expect(user?.usageLimits).toHaveProperty("dailyVoiceMinutes");
  });

  test("rejects an unverified Google identity", async () => {
    const t = convexTest(schema, modules);
    await expect(t.run((ctx) => createOrUpdateUser(ctx, {
      existingUserId: null, type: "oauth", provider: google,
      profile: { email: adminEmail, emailVerified: false },
    }))).rejects.toThrow(/verified email/);
  });

  test("only Google's verified email can bootstrap a new admin", async () => {
    const t = convexTest(schema, modules);
    const id = await createGoogleUser(t, adminEmail);
    expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({ role: "admin" });
    const passwordId = await t.run((ctx) => createOrUpdateUser(ctx, {
      existingUserId: null, type: "credentials", provider: password,
      profile: { email: adminEmail, emailVerified: true },
    }));
    expect(await t.run((ctx) => ctx.db.get(passwordId))).toMatchObject({ role: "user" });
  });

  test("does not merge accounts that merely share an email", async () => {
    const t = convexTest(schema, modules);
    const existingId = await t.run((ctx) => createOrUpdateUser(ctx, {
      existingUserId: null, type: "credentials", provider: password,
      profile: { email: "ada@example.com" },
    }));
    const googleId = await createGoogleUser(t);
    expect(googleId).not.toBe(existingId);
    expect(await t.run((ctx) => ctx.db.get(existingId))).toMatchObject({ role: "user" });
  });

  test("repeat Google sign-in preserves identity, role and preferences", async () => {
    const t = convexTest(schema, modules);
    const id = await createGoogleUser(t);
    await t.run((ctx) => ctx.db.patch(id, { preferences: { theme: "light" }, status: "disabled" }));
    const result = await t.run((ctx) => createOrUpdateUser(ctx, {
      existingUserId: id, type: "oauth", provider: google,
      profile: { email: adminEmail, emailVerified: true, name: "Updated name" },
    }));
    expect(result).toBe(id);
    expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({ role: "user", status: "disabled", preferences: { theme: "light" }, name: "Updated name" });
  });

  test("Google-created users retain unauthenticated and cross-user data boundaries", async () => {
    const t = convexTest(schema, modules);
    const aliceId = await createGoogleUser(t);
    const bobId = await createGoogleUser(t, "bob@example.com");
    const alice = t.withIdentity({ subject: `${aliceId}|alice-session` });
    const bob = t.withIdentity({ subject: `${bobId}|bob-session` });
    const conversationId = await alice.mutation(api.conversations.create, {});
    await expect(t.mutation(api.conversations.create, {})).rejects.toThrow();
    await expect(bob.query(api.conversations.get, { conversationId })).rejects.toThrow();
    await expect(bob.mutation(api.conversations.rename, { conversationId, title: "Not mine" })).rejects.toThrow();
    expect(await bob.query(api.users.currentUser, {})).toMatchObject({ _id: bobId, role: "user" });
    await expect(bob.query(api.admin.overview, {})).rejects.toThrow();
  });
});
