"use client";

import * as React from "react";
import { Input as HeroInput, TextArea as HeroTextArea, Label as HeroLabel } from "@heroui/react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <HeroInput
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted",
      "outline-none transition-colors focus-visible:border-hugo-cyan/50 focus-visible:ring-2 focus-visible:ring-hugo-cyan/20",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <HeroTextArea
    ref={ref}
    className={cn(
      "flex min-h-20 w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted",
      "outline-none transition-colors focus-visible:border-hugo-cyan/50 focus-visible:ring-2 focus-visible:ring-hugo-cyan/20",
      "disabled:cursor-not-allowed disabled:opacity-50 resize-none scroll-thin",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <HeroLabel
      className={cn("text-sm font-medium text-text-secondary", className)}
      {...props}
    />
  );
}
