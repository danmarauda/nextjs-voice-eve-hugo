"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { getAuthRedirect } from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { OrbSlot } from "@/components/hugo/OrbSlot";
import { useAuthTransition } from "@/components/providers/ConvexClientProvider";

type AuthMode = "signIn" | "signUp";

const COPY: Record<
  AuthMode,
  {
    title: string;
    subtitle: string;
    submit: string;
    pending: string;
    switchPrompt: string;
    switchLabel: string;
    switchHref: string;
  }
> = {
  signIn: {
    title: `Welcome back to ${APP_NAME}`,
    subtitle: "Sign in to pick up your conversations.",
    submit: "Sign in",
    pending: "Signing in…",
    switchPrompt: "New here?",
    switchLabel: "Create an account",
    switchHref: "/sign-up",
  },
  signUp: {
    title: `Create your ${APP_NAME} account`,
    subtitle: APP_TAGLINE,
    submit: "Create account",
    pending: "Creating account…",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/sign-in",
  },
};

/**
 * AuthForm — email/password and Google sign-in via Convex Auth. Handles both
 * sign in and sign up flows, with safe return paths and inline OAuth errors.
 * Both sign-in methods disable the form while a request is in flight.
 */
export function AuthForm({ mode }: { mode: AuthMode }) {
  const { signIn } = useAuthActions();
  const { clearSignOut } = useAuthTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const copy = COPY[mode];

  const [pendingProvider, setPendingProvider] = useState<"password" | "google" | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const submitting = pendingProvider !== null;
  const destination = getAuthRedirect(searchParams.get("next"));
  const oauthReturned = searchParams.get("oauth") === "google";

  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) setPendingProvider(null);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  async function onGoogleSignIn() {
    if (submitting) return;
    setGoogleError(null);

    // Google blocks embedded sign-in; start from the app in a top-level tab.
    if (window.self !== window.top) {
      window.open(window.location.href, "_blank", "noopener,noreferrer");
      toast.info("Continue with Google in the new tab. If it did not open, allow pop-ups.");
      return;
    }

    setPendingProvider("google");
    try {
      const callback = new URLSearchParams({ oauth: "google", next: destination });
      await signIn("google", { redirectTo: `/sign-in?${callback}` });
    } catch {
      setGoogleError("Could not start Google sign-in. Please try again or use email and password.");
      setPendingProvider(null);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();

    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }
    if (mode === "signUp" && password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setPendingProvider("password");
    try {
      await signIn("password", {
        email,
        password,
        ...(mode === "signUp" ? { name, flow: "signUp" } : { flow: "signIn" }),
      });
      clearSignOut();
      router.push(destination);
    } catch {
      toast.error(
        mode === "signUp"
          ? "Could not create your account. That email may already be in use."
          : "Invalid email or password.",
      );
      setPendingProvider(null);
    }
  }

  const switchHref = `${copy.switchHref}?next=${encodeURIComponent(destination)}`;
  const oauthError = googleError ?? (oauthReturned && !submitting
    ? "Google sign-in was not completed. Please try again or use email and password."
    : null);

  return (
    <Card className="animate-rise w-full max-w-sm rounded-[2rem] p-7 sm:p-8">
      <div className="flex flex-col items-center text-center">
        <OrbSlot state="idle" size={72} />
        <h1 className="mt-5 font-sans text-[1.75rem] leading-tight font-normal text-balance text-text-primary">
          {copy.title}
        </h1>
        <p className="mt-2 text-base leading-relaxed text-pretty text-text-secondary">{copy.subtitle}</p>
      </div>

      <div className="mt-7">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={onGoogleSignIn}
          disabled={submitting}
          aria-busy={pendingProvider === "google"}
          aria-describedby={oauthError ? "google-sign-in-error" : undefined}
        >
          {pendingProvider === "google" ? (
            <><Spinner className="text-text-primary" />Connecting to Google…</>
          ) : "Continue with Google"}
        </Button>
        {oauthError && (
          <p id="google-sign-in-error" role="alert" className="mt-3 text-sm leading-relaxed text-error">
            {oauthError}
          </p>
        )}
      </div>

      <div className="my-5 flex items-center gap-3 text-sm text-text-secondary">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        <span>or continue with email</span>
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === "signUp" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              className="h-12 text-base"
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Ada Lovelace"
              disabled={submitting}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            className="h-12 text-base"
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            disabled={submitting}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            className="h-12 text-base"
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signUp" ? "new-password" : "current-password"}
            required
            minLength={mode === "signUp" ? 8 : undefined}
            placeholder="••••••••"
            disabled={submitting}
          />
          {mode === "signUp" && (
            <p className="text-sm text-text-secondary">At least 8 characters.</p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="mt-1 w-full"
          disabled={submitting}
          aria-busy={pendingProvider === "password"}
        >
          {pendingProvider === "password" ? (
            <>
              <Spinner className="text-text-primary" />
              {copy.pending}
            </>
          ) : (
            copy.submit
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-base text-text-secondary">
        {copy.switchPrompt}{" "}
        <Link
          href={switchHref}
          className="inline-flex min-h-11 items-center font-medium text-hugo-cyan outline-none transition-opacity hover:opacity-80 focus-visible:underline"
        >
          {copy.switchLabel}
        </Link>
      </p>
    </Card>
  );
}
