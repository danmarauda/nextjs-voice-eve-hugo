"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { ArrowRight } from "lucide-react";
import { createScope, createTimeline } from "animejs";
import { useReducedMotion } from "@/components/motion/useReducedMotion";

export function Hero({
  artwork,
  initialAuthed = false,
}: {
  artwork: ReactNode;
  /** Auth resolved on the server (app/page.tsx) so first paint is correct. */
  initialAuthed?: boolean;
}) {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const authed = isLoading ? initialAuthed : isAuthenticated;
  const destination = authed ? "/chat" : "/sign-in?next=%2Fchat";
  const rootRef = useRef<HTMLElement>(null);
  const navigatedRef = useRef(false);
  const [finished, setFinished] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scope = createScope({ root });
    scope.add(() => {
      // Read the media query before the first frame, including hydration when
      // useReducedMotion still holds its server snapshot.
      const reduce = reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const timeline = createTimeline({
        defaults: { ease: "out(3)" },
        onComplete: () => setFinished(true),
      });

      if (reduce) {
        timeline.add("[data-intro-artwork]", { opacity: [0.25, 0.35], duration: 180 });
        return;
      }

      timeline
        .add("[data-intro-artwork]", {
          scale: [1.12, 1],
          duration: 2400,
          ease: "out(2)",
        }, 0)
        .add("[data-intro-artwork]", { opacity: [0.25, 1], duration: 1000 }, 0)
        .add("[data-intro-progress]", {
          scaleX: [0, 1],
          duration: 2400,
          ease: "linear",
        }, 0)
        .add("[data-intro-artwork]", { opacity: 0.35, duration: 400 }, 2400)
        .add("[data-intro-progress]", { opacity: 0, duration: 300 }, 2400);
    });

    return () => scope.revert();
  }, [reducedMotion]);

  useEffect(() => {
    if (!finished || navigatedRef.current) return;
    navigatedRef.current = true;
    // Replace prevents Back from replaying the intro. /chat still performs its
    // authoritative server-side identity check, including for expired tokens.
    router.replace(destination);
  }, [destination, finished, router]);

  return (
    <main
      ref={rootRef}
      data-intro-state={finished ? "complete" : "playing"}
      className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-background text-text-primary"
    >
      <h1 className="sr-only">ALIAS BDO</h1>
      <div
        aria-hidden="true"
        data-intro-artwork
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ opacity: 0.25 }}
      >
        {artwork}
      </div>
      <div className="flex justify-end px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
        <Link
          href={destination}
          replace
          onNavigate={() => { navigatedRef.current = true; }}
          className="glass-button inline-flex items-center justify-center gap-2 px-5 font-sans outline-none"
        >
          {finished ? "Continue" : "Skip intro"}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <div className="mt-auto flex justify-center pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div aria-hidden="true" className="h-px w-16 overflow-hidden bg-border-strong motion-reduce:hidden">
          <div
            data-intro-progress
            className="h-full w-full origin-left bg-text-primary"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
      </div>
      <p role="status" className="sr-only">
        {finished ? (authed ? "Opening your agent." : "Opening sign in.") : "ALIAS BDO introduction."}
      </p>
    </main>
  );
}
