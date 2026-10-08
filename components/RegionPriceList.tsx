"use client";

import { ProcessingFeeHint } from "@/components/catalog/ProcessingFeeHint";
import {
  settingsListClassName,
  settingsRowClassName,
} from "@/components/dashboard/settings/SettingsUi";
import { cn } from "@/lib/utils";
import {
  MALAYSIA_REGIONS,
  type RegionPriceInputs,
} from "@/utils/booking/regions";

/** One RM input per Malaysian region; blank = not served. */
export function RegionPriceList({
  value,
  onChange,
  disabled = false,
  feeHint,
  className,
}: {
  value: RegionPriceInputs;
  onChange: (next: RegionPriceInputs) => void;
  disabled?: boolean;
  /** Shows the client price per state: "full" = the whole booking price, "extra" = added on top. */
  feeHint?: "full" | "extra";
  className?: string;
}) {
  return (
    <div className={cn(settingsListClassName, className)}>
      {MALAYSIA_REGIONS.map((region) => {
        const inputId = `region-price-${region.id}`;
        return (
          <div
            key={region.id}
            className={cn(settingsRowClassName, "hover:bg-transparent")}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <label
                htmlFor={inputId}
                className="truncate text-sm font-medium"
              >
                {region.label}
              </label>
              {feeHint ? (
                <ProcessingFeeHint
                  amountRm={value[region.id]}
                  includeFixed={feeHint === "full"}
                />
              ) : null}
            </div>
            <div className="flex h-9 w-32 shrink-0 items-center rounded-md border border-border bg-white/60 px-2 text-sm focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 dark:bg-white/5">
              <span className="pr-1 text-muted-foreground">RM</span>
              <input
                id={inputId}
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                disabled={disabled}
                value={value[region.id] ?? ""}
                onChange={(event) =>
                  onChange({ ...value, [region.id]: event.target.value })
                }
                placeholder="—"
                className="h-full w-full min-w-0 bg-transparent text-right outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
