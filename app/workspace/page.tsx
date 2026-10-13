import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { authToken, fetchQuery } from "@/lib/convex-server";
import { AppShell } from "@/components/layout/AppShell";
import { DocumentWorkspace } from "@/components/workspace/DocumentWorkspace";

export const metadata: Metadata = {
  title: "Document workspace",
  description: "Your private bid documents and source-grounded working drafts.",
};

export default async function WorkspacePage() {
  const token = await authToken();
  if (!token) redirect("/sign-in?next=/workspace");
  const user = await fetchQuery(api.users.currentUser, {}, { token });
  if (!user || user.status !== "active") redirect("/sign-in");
  return <AppShell><DocumentWorkspace /></AppShell>;
}
