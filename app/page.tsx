import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { TopNav } from "@/components/layout/TopNav";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { LandingArtwork } from "@/components/landing/LandingArtwork";
import { FeatureGrid } from "@/components/landing/FeatureGrid";

/**
 * Landing / marketing page (PRD 5.2) — the primary showcase surface.
 *
 * Server component by design: the only interactive bits (orb navigation,
 * auth-gated CTAs) live in <Hero>; the feature grid handles its own entrance.
 * Artwork, chrome, and the tech strip render on the server.
 *
 * Layout, top to bottom:
 *   1. Dark-first material surface
 *   2. TopNav
 *   3. Hero (ALIAS artwork, orb, headline, CTAs) — above the fold
 *   4. "Command surface" feature grid
 *   5. Tech strip
 *   6. Footer
 */

const TECH_STACK = [
  "Next.js 16",
  "AI SDK 7",
  "AI Gateway realtime voice",
  "Eve",
  "Convex",
];

export default async function LandingPage() {
  // Resolve just enough state on the server for a stable first paint without
  // spending an extra Convex query on every authenticated homepage request.
  // Protected routes still do the authoritative auth check server-side.
  const token = await convexAuthNextjsToken().catch(() => undefined);
  const initialAuthed = token != null;
  const settings = initialAuthed
    ? null
    : await fetchQuery(api.settings.getPublic, {}).catch(() => null);
  const guestPreviewEnabled = settings?.guestPreviewEnabled === true;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden">
      <TopNav />

      <main className="flex flex-1 flex-col">
        {/* Hero — above the fold, viewport-first */}
        <section className="relative flex items-center justify-center px-6 pb-20 pt-24 lg:min-h-[88svh] lg:pb-24 lg:pt-32">
          <div className="w-full max-w-6xl">
            <Hero
              artwork={<LandingArtwork />}
              initialAuthed={initialAuthed}
              guestPreviewEnabled={guestPreviewEnabled}
            />
          </div>
        </section>

        {/* Command surface */}
        <section className="relative px-6 pb-12">
          <div className="mx-auto w-full max-w-6xl">
            <div className="animate-rise mb-8 flex flex-col items-center gap-3 text-center">
              <span className="font-mono text-xs tracking-widest text-hugo-cyan">
                THE COMMAND SURFACE
              </span>
              <h2 className="text-balance text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
                One agent. Voice, text, memory, and oversight.
              </h2>
              <p className="max-w-2xl text-balance text-sm text-text-secondary">
                ALIAS BDO connects your bid documents with voice, text, and
                source-grounded drafts in a private workspace.
              </p>
            </div>
            <FeatureGrid />
          </div>
        </section>

        {/* Tech strip */}
        <section className="relative px-6 py-12">
          <div className="mx-auto w-full max-w-4xl">
            <div className="panel flex flex-col items-center gap-4 px-6 py-5 text-center">
              <span className="font-mono text-[10px] tracking-[0.2em] text-text-muted">
                POWERED BY
              </span>
              <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
                {TECH_STACK.map((tech, i) => (
                  <li key={tech} className="flex items-center gap-2">
                    <span className="font-mono text-xs text-text-secondary sm:text-sm">
                      {tech}
                    </span>
                    {i < TECH_STACK.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className="text-text-muted/50"
                      >
                        ·
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
