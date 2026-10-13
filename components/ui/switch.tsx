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
      className={cn("min-h-11 min-w-11 shrink-0", danger && "[--accent:var(--warning)]")}
    >
      <HeroSwitch.Content>
        <HeroSwitch.Control className="glass-switch-control">
          <HeroSwitch.Thumb className="glass-switch-thumb" />
        </HeroSwitch.Control>
      </HeroSwitch.Content>
    </HeroSwitch>
  );
}
