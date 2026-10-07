"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { DepositType } from "@/schemas/packageSchema";

const DEPOSIT_TYPE_OPTIONS: { value: DepositType; label: string }[] = [
  { value: "fixed", label: "RM" },
  { value: "percent", label: "%" },
];

/** Deposit amount with a flat (RM) / percentage-of-price toggle. */
export function DepositField({
  label = "Deposit",
  value,
  type,
  onValueChange,
  onTypeChange,
  inputClassName,
  disabled = false,
  placeholder,
}: {
  label?: string;
  value: string;
  type: DepositType;
  onValueChange: (value: string) => void;
  onTypeChange: (type: DepositType) => void;
  inputClassName?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          className={cn("flex-1", inputClassName)}
          type="number"
          min="0"
          max={type === "percent" ? 100 : undefined}
          step="1"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder ?? (type === "percent" ? "30" : "400")}
        />
        <div
          className="flex h-10 shrink-0 rounded-md border border-border bg-white/60 p-0.5 dark:bg-white/5"
          role="radiogroup"
          aria-label={`${label} type`}
        >
          {DEPOSIT_TYPE_OPTIONS.map((option) => {
            const selected = option.value === type;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => onTypeChange(option.value)}
                className={cn(
                  "min-w-10 rounded px-2 text-sm font-medium transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {type === "percent"
          ? "A percentage of the price the client is charged."
          : "A flat amount in RM."}
      </p>
    </div>
  );
}

/** Parses a deposit input; `undefined` = blank, `null` = invalid. */
export function parseDepositInput(
  value: string,
  type: DepositType
): number | undefined | null {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  if (type === "percent" && parsed > 100) return null;
  return parsed;
}
