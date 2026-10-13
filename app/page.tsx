import type { Metadata } from "next";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { Hero } from "@/components/landing/Hero";
import { LandingArtwork } from "@/components/landing/LandingArtwork";

export const metadata: Metadata = {
  title: "ALIAS BDO",
  description: "Enter ALIAS BDO. Sign in to your private voice and chat workspace.",
};

export default async function LandingPage() {
  // Resolve just enough state on the server for a stable first paint without
  // spending an extra Convex query on every authenticated homepage request.
  // Protected routes still do the authoritative auth check server-side.
  const token = await convexAuthNextjsToken().catch(() => undefined);

  return <Hero artwork={<LandingArtwork />} initialAuthed={token != null} />;
}
