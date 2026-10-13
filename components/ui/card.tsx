"use client";

import * as React from "react";
import { Card as HeroCard } from "@heroui/react";
import { cn } from "@/lib/utils";

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <HeroCard
      className={cn("liquid-glass gap-0 p-0 text-text-primary", className)}
      {...props}
    >
      {children}
    </HeroCard>
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <HeroCard.Header className={cn("gap-1 p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <HeroCard.Title className={cn("text-sm font-medium text-text-primary", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <HeroCard.Description className={cn("text-sm text-text-secondary", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <HeroCard.Content className={cn("block p-5 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <HeroCard.Footer className={cn("p-5 pt-0", className)} {...props} />;
}
