/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const modules = import.meta.glob("../**/*.ts");

type Role = "user" | "admin";

async function seedUser(
  t: ReturnType<typeof convexTest>,
  email: string,
  role: Role = "user",
): Promise<Id<"users">> {
  const now = Date.now();
  return await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      role,
      status: "active",
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
      preferences: { theme: "dark" },
    }),
  );
}

function as(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: `${userId}|test-session` });
}

describe("admin console protections", () => {
  test("non-admins cannot change roles", async () => {
    const t = convexTest(schema, modules);
    const user = await seedUser(t, "user@example.com");
    const other = await seedUser(t, "other@example.com");
    await expect(
      as(t, user).mutation(api.admin.setUserRole, { userId: other, role: "admin" }),
    ).rejects.toThrow();
    await expect(
      as(t, user).mutation(api.admin.setUserRole, { userId: user, role: "admin" }),
    ).rejects.toThrow();
  });

  test("an admin cannot demote or disable themselves", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedUser(t, "admin@example.com", "admin");
    await seedUser(t, "second@example.com", "admin");
    await expect(
      as(t, admin).mutation(api.admin.setUserRole, { userId: admin, role: "user" }),
    ).rejects.toThrow(/your own/i);
    await expect(
      as(t, admin).mutation(api.admin.setUserStatus, { userId: admin, status: "disabled" }),
    ).rejects.toThrow(/your own/i);
  });

  test("admins can manage other admins while another active admin remains", async () => {
    const t = convexTest(schema, modules);
    const admin = await seedUser(t, "admin@example.com", "admin");
    const second = await seedUser(t, "second@example.com", "admin");
    await as(t, admin).mutation(api.admin.setUserRole, { userId: second, role: "user" });
    const demoted = await t.run((ctx) => ctx.db.get(second));
    expect(demoted?.role).toBe("user");
    const audits = await t.run((ctx) => ctx.db.query("adminAuditLogs").collect());
    expect(audits.some((a) => a.action === "user.setRole")).toBe(true);
  });

  test("bootstrapAdmin promotes the first admin only once", async () => {
    const t = convexTest(schema, modules);
    const owner = await seedUser(t, "owner@example.com");
    await seedUser(t, "later@example.com");
    await t.mutation(internal.admin.bootstrapAdmin, { email: " Owner@Example.com " });
    expect((await t.run((ctx) => ctx.db.get(owner)))?.role).toBe("admin");
    await expect(
      t.mutation(internal.admin.bootstrapAdmin, { email: "later@example.com" }),
    ).rejects.toThrow(/already exists/i);
  });
});
