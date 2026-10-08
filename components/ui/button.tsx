"use client";

import * as React from "react";
import { Button as HeroButton } from "@heroui/react";
import { cn } from "@/lib/utils";
import { buttonVariants, buttonVariantMap, type ButtonVariantProps } from "./button-variants";

export interface ButtonProps
  extends Omit<React.ComponentProps<typeof HeroButton>, "variant" | "size" | "className">,
    ButtonVariantProps {
  className?: string;
  disabled?: boolean;
  title?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, disabled, isDisabled, title, render, ...props }, ref) => (
    <HeroButton
      ref={ref}
      variant={buttonVariantMap[variant ?? "default"]}
      size={size === "icon" ? "md" : (size ?? "md")}
      isIconOnly={size === "icon"}
      isDisabled={disabled || isDisabled}
      className={cn(buttonVariants({ variant, size }), className)}
      // React Aria filters native title; keep existing tooltips via its DOM render contract.
      render={(domProps, state) => render
        ? render({ ...domProps, title }, state)
        : <button {...domProps} title={title} />}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
