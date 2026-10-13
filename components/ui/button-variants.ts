import { buttonVariants as heroButtonVariants } from "@heroui/styles";
import { cn } from "@/lib/utils";

export const buttonVariantMap = {
  primary: "primary",
  default: "primary",
  outline: "outline",
  ghost: "ghost",
  subtle: "secondary",
  destructive: "danger-soft",
} as const;

export interface ButtonVariantProps {
  variant?: keyof typeof buttonVariantMap | null;
  size?: "sm" | "md" | "lg" | "icon" | null;
}

/**
 * Button class variants — kept in a NON-client module so both client
 * components and React Server Components can call `buttonVariants(...)` (e.g. to
 * style a <Link> like a button). Importing this from a `"use client"` module
 * would make it a client reference that cannot be invoked on the server.
 */
export function buttonVariants({ variant, size }: ButtonVariantProps = {}) {
  const resolvedVariant = variant ?? "default";
  return cn(
    heroButtonVariants({
      variant: buttonVariantMap[resolvedVariant],
      size: size === "icon" ? "md" : (size ?? "md"),
      isIconOnly: size === "icon",
    }),
    "glass-button gap-2 font-sans [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]",
    resolvedVariant === "primary" && "glass-button--primary",
    resolvedVariant === "ghost" && "glass-button--ghost",
    resolvedVariant === "destructive" && "glass-button--destructive",
    size === "lg" && "min-h-12 text-lg",
    size === "icon" && "size-11 min-w-11 p-0",
  );
}
