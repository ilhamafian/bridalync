"use client";

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
  className,
}: {
  value: RegionPriceInputs;
  onChange: (next: RegionPriceInputs) => void;
  disabled?: boolean;
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
            <label
              htmlFor={inputId}
              className="min-w-0 flex-1 truncate text-sm font-medium"
            >
              {region.label}
            </label>
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
