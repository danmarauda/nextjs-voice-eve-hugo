"use client";

import * as React from "react";
import {
  Avatar as HeroAvatar,
  Separator as HeroSeparator,
  Skeleton as HeroSkeleton,
  Spinner as HeroSpinner,
} from "@heroui/react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <HeroSkeleton animationType="pulse" className={cn("rounded-md bg-surface-elevated", className)} {...props} />;
}

export function Separator({
  className,
  orientation = "horizontal",
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
}) {
  return <HeroSeparator orientation={orientation} className={className} />;
}

export function Avatar({
  name,
  src,
  className,
}: {
  name?: string | null;
  src?: string | null;
  className?: string;
}) {
  const letters = (name?.trim() || "?").slice(0, 2).toUpperCase();
  return (
    <HeroAvatar size="sm" className={cn("size-8 border border-border bg-surface-elevated text-text-secondary", className)}>
      {src ? <HeroAvatar.Image src={src} alt={name ?? "Avatar"} /> : null}
      <HeroAvatar.Fallback aria-label={name ?? "Avatar"}>{letters}</HeroAvatar.Fallback>
    </HeroAvatar>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <HeroSpinner size="sm" color="current" aria-label="Loading" className={cn("size-4", className)} />;
}
