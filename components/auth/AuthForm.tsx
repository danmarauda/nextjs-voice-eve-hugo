"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import { Eye, EyeOff } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { safeRedirectPath } from "@/lib/safe-redirect";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REQUIREMENTS_TEXT,
  passwordProblem,
} from "@/convex/model/passwordPolicy";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Spinner } from "@/components/ui/misc";
import { OrbSlot } from "@/components/hugo/OrbSlot";
import { useAuthTransition } from "@/components/providers/ConvexClientProvider";

type AuthMode = "signIn" | "signUp";
type FieldName = "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function describeFailure(mode: AuthMode, error: unknown): string {
  if (error instanceof ConvexError) {
    const data = error.data as { code?: string; message?: string } | undefined;
    if (data?.code === "INVALID_PASSWORD" && data.message) return data.message;
  }
  const message = error instanceof Error ? error.message : "";
  if (/TooManyFailedAttempts|rate limit/i.test(message)) {
    return "Too many attempts. Wait a few minutes before trying again.";
  }
  if (/disabled/i.test(message)) {
    return "This account is disabled. Contact an administrator.";
  }
  return mode === "signUp"
    ? "We couldn't create an account with those details. If you already have one, sign in instead."
    : "That email and password combination didn't work.";
}

/**
 * Email/password sign-in and sign-up through Convex Auth. Validation and
 * failures are shown inline and announced; only a validated same-origin `next`
 * destination is followed after success.
 */
export function AuthForm({ mode }: { mode: AuthMode }) {
  const { signIn } = useAuthActions();
  const { clearSignOut } = useAuthTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const copy = COPY[mode];
  const ids = useId();
  const formErrorRef = useRef<HTMLParagraphElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const rawNext = searchParams.get("next");
  const destination = safeRedirectPath(rawNext);
  const switchHref =
    rawNext && destination === rawNext
      ? `${copy.switchHref}?next=${encodeURIComponent(destination)}`
      : copy.switchHref;

  const errorId = (field: FieldName) => `${ids}-${field}-error`;
  const hintId = `${ids}-password-hint`;

  function validate(email: string, password: string): FieldErrors {
    const errors: FieldErrors = {};
    if (!email) errors.email = "Enter your email address.";
    else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Enter your password.";
    else if (mode === "signUp") {
      const problem = passwordProblem(password);
      if (problem) errors.password = problem;
    }
    return errors;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();

    const errors = validate(email, password);
    setFieldErrors(errors);
    setFormError(null);
    const firstInvalid = (["email", "password"] as const).find((f) => errors[f]);
    if (firstInvalid) {
      form.querySelector<HTMLInputElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await signIn("password", {
        email,
        password,
        ...(mode === "signUp" ? { name, flow: "signUp" } : { flow: "signIn" }),
      });
      clearSignOut();
      router.replace(destination);
    } catch (error) {
      setFormError(describeFailure(mode, error));
      setSubmitting(false);
      const passwordInput = form.querySelector<HTMLInputElement>('[name="password"]');
      if (passwordInput) passwordInput.value = "";
      requestAnimationFrame(() => formErrorRef.current?.focus());
    }
  }

  return (
    <div className="panel animate-rise w-full max-w-sm p-6 sm:p-8">
      <div className="flex flex-col items-center text-center">
        <OrbSlot state="idle" size={72} />
        <h1 className="mt-5 text-balance text-lg font-semibold tracking-tight text-text-primary">
          {copy.title}
        </h1>
        <p className="mt-1.5 text-pretty text-sm leading-relaxed text-text-secondary">
          {copy.subtitle}
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-7 flex flex-col gap-4">
        {formError && (
          <p
            ref={formErrorRef}
            role="alert"
            tabIndex={-1}
            className="rounded-md border border-error/40 bg-error/10 px-3 py-2.5 text-sm leading-relaxed text-text-primary outline-none"
          >
            {formError}
          </p>
        )}

        {mode === "signUp" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${ids}-name`}>
              Name <span className="font-normal text-text-muted">(optional)</span>
            </Label>
            <Input
              id={`${ids}-name`}
              name="name"
              type="text"
              autoComplete="name"
              maxLength={100}
              className="h-11 text-base"
              disabled={submitting}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${ids}-email`}>Email</Label>
          <Input
            id={`${ids}-email`}
            name="email"
            type="email"
            inputMode="email"
            autoComplete={mode === "signUp" ? "email" : "username"}
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={254}
            placeholder="you@example.com"
            className="h-11 text-base"
            disabled={submitting}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? errorId("email") : undefined}
            onChange={() => fieldErrors.email && setFieldErrors((e) => ({ ...e, email: undefined }))}
          />
          {fieldErrors.email && (
            <p id={errorId("email")} className="text-sm text-error">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${ids}-password`}>Password</Label>
          <div className="relative">
            <Input
              id={`${ids}-password`}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "signUp" ? "new-password" : "current-password"}
              required
              minLength={mode === "signUp" ? PASSWORD_MIN_LENGTH : undefined}
              maxLength={PASSWORD_MAX_LENGTH}
              className="h-11 pr-12 text-base"
              disabled={submitting}
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={
                [fieldErrors.password && errorId("password"), mode === "signUp" && hintId]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              onChange={() =>
                fieldErrors.password && setFieldErrors((e) => ({ ...e, password: undefined }))
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-text-muted outline-none transition-colors hover:text-text-primary focus-visible:text-text-primary focus-visible:ring-2 focus-visible:ring-hugo-cyan/60"
            >
              {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </div>
          {fieldErrors.password && (
            <p id={errorId("password")} className="text-sm text-error">
              {fieldErrors.password}
            </p>
          )}
          {mode === "signUp" && (
            <p id={hintId} className="text-xs leading-relaxed text-text-muted">
              {PASSWORD_REQUIREMENTS_TEXT}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="mt-1 h-11 w-full"
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? (
            <>
              <Spinner className="border-black/30 border-t-black" />
              {copy.pending}
            </>
          ) : (
            copy.submit
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        {copy.switchPrompt}{" "}
        <Link
          href={switchHref}
          className="inline-flex min-h-11 items-center font-medium text-hugo-cyan outline-none transition-opacity hover:opacity-80 focus-visible:underline"
        >
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  );
}
