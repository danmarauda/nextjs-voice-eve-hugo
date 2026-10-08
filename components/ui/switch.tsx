"use client";

import { Switch as HeroSwitch } from "@heroui/react";
import { cn } from "@/lib/utils";

export function Switch({
  label,
  checked,
  onCheckedChange,
  disabled,
  danger,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <HeroSwitch
      aria-label={label}
      isSelected={checked}
      onChange={onCheckedChange}
      isDisabled={disabled}
      className={cn("shrink-0", danger && "[--accent:var(--warning)]")}
    >
      <HeroSwitch.Content>
        <HeroSwitch.Control>
          <HeroSwitch.Thumb />
        </HeroSwitch.Control>
      </HeroSwitch.Content>
    </HeroSwitch>
  );
}
