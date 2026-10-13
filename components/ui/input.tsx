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
      "glass-field flex h-12 w-full px-4 py-3 font-sans text-base text-text-primary placeholder:text-text-secondary/70",
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
      "glass-field flex min-h-20 w-full px-4 py-3 font-sans text-base text-text-primary placeholder:text-text-secondary/70",
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
      className={cn("font-sans text-base font-normal text-text-secondary", className)}
      {...props}
    />
  );
}
