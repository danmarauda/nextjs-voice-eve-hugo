import { Suspense } from "react";
import type { Metadata } from "next";
import { LandingArtwork } from "@/components/landing/LandingArtwork";
import { AuthForm } from "@/components/auth/AuthForm";
import { Logo } from "@/components/layout/Logo";
import { Skeleton } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to ALIAS BDO.",
};

function AuthCardFallback() {
  return (
    <div className="panel flex w-full max-w-sm flex-col gap-4 p-8">
      <Skeleton className="mx-auto size-16 rounded-full" />
      <Skeleton className="mx-auto h-5 w-48" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

export default function SignInPage() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4 py-24 text-text-primary">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-20">
        <LandingArtwork />
      </div>
      <div className="absolute left-4 top-5 sm:left-6">
        <Logo />
      </div>
      {/* useSearchParams in AuthForm requires a Suspense boundary. */}
      <Suspense fallback={<AuthCardFallback />}>
        <AuthForm mode="signIn" />
      </Suspense>
    </main>
  );
}
