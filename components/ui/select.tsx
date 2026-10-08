"use client";

import { Label, ListBox, Select as HeroSelect } from "@heroui/react";
import { cn } from "@/lib/utils";

export interface SelectProps {
  id: string;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function Select({ id, label, value, options, onValueChange, disabled, className }: SelectProps) {
  return (
    <HeroSelect
      id={id}
      value={value || null}
      onChange={(key) => { if (key !== null) onValueChange(String(key)); }}
      isDisabled={disabled}
      className={cn("w-full", className)}
    >
      <Label>{label}</Label>
      <HeroSelect.Trigger className="h-10 rounded-md">
        <HeroSelect.Value />
        <HeroSelect.Indicator />
      </HeroSelect.Trigger>
      <HeroSelect.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </HeroSelect.Popover>
    </HeroSelect>
  );
}
