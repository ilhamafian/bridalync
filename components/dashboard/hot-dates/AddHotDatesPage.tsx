"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { BackButton } from "@/components/dashboard/BackButton";
import { SummaryRow } from "@/components/dashboard/blocked/SummaryRow";
import {
  DashboardCalendar,
  hotDayClassName,
  parseDateKey,
} from "@/components/dashboard/DashboardCalendar";
import { EmptyCard } from "@/components/dashboard/DashboardHome";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import {
  RowText,
  SettingsFeedback,
  SettingsSection,
  settingsListClassName,
} from "@/components/dashboard/settings/SettingsUi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toDateKey } from "@/utils/booking/availability";
import {
  formatDateKeysLabel,
  MAX_DATE_RANGE_DAYS,
} from "@/utils/booking/dateRange";
import {
  buildHotDateRowPriceMap,
  toHotDateItem,
  type HotDateCatalogRow,
  type HotDateLookup,
} from "@/utils/booking/hotDates";
import { formatRm } from "@/utils/booking/pricing";
import type { HotDateItem } from "@/utils/dashboardShell";

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-white/60 pr-3 pl-10 text-right text-sm text-foreground tabular-nums dark:bg-white/5",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** Prefills each row with its price when every selected date shares it, else blank. */
function buildDraft(
  catalog: HotDateCatalogRow[],
  priceMap: Map<string, number>,
  dateKeys: string[]
): Record<string, string> {
  const draft: Record<string, string> = {};
  if (dateKeys.length === 0) return draft;

  for (const row of catalog) {
    const values = dateKeys.map((date) => priceMap.get(`${date}|${row.key}`));
    const first = values[0];
    draft[row.key] =
      first !== undefined && values.every((value) => value === first)
        ? String(first)
        : "";
  }
  return draft;
}

function toSortedDateKeys(dates: Date[] | undefined) {
  return [...new Set((dates ?? []).map((date) => toDateKey(date)))]
    .filter(Boolean)
    .sort();
}

export function AddHotDatesPage({
  hotDates,
  catalog,
  chargeBy,
  hotDateIsExtraCharge = false,
  initialDates,
  onSaved,
}: {
  hotDates: HotDateItem[];
  catalog: HotDateCatalogRow[];
  chargeBy: "package" | "style";
  /** Events are priced per state, so a hot date amount is added on top of the state price. */
  hotDateIsExtraCharge?: boolean;
  /** YYYY-MM-DD keys, set when editing existing hot dates from the list. */
  initialDates?: string[];
  onSaved: (hotDates: HotDateItem[]) => void;
}) {
  const router = useRouter();
  const editing = Boolean(initialDates?.length);
  const priceMap = useMemo(() => buildHotDateRowPriceMap(hotDates), [hotDates]);
  const [dates, setDates] = useState<Date[] | undefined>(() =>
    initialDates?.map(parseDateKey)
  );
  const [draft, setDraft] = useState(() =>
    buildDraft(catalog, priceMap, [...(initialDates ?? [])].sort())
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedKeys = useMemo(() => toSortedDateKeys(dates), [dates]);
  const hotKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of hotDates) {
      for (const row of catalog) {
        if (priceMap.has(`${item.date}|${row.key}`)) keys.add(item.date);
      }
    }
    return keys;
  }, [hotDates, catalog, priceMap]);
  const hotDays = useMemo(() => [...hotKeys].map(parseDateKey), [hotKeys]);

  const count = selectedKeys.length;
  const alreadyHot = selectedKeys.filter((key) => hotKeys.has(key)).length;
  const pricedRows = catalog.filter((row) => (draft[row.key] ?? "").trim() !== "");
  const removing = count > 0 && pricedRows.length === 0;
  const tooMany = count > MAX_DATE_RANGE_DAYS;

  const statusText =
    count === 0
      ? "—"
      : alreadyHot === count
        ? count === 1
          ? "Already a hot date"
          : "Already hot dates"
        : alreadyHot > 0
          ? `${alreadyHot} of ${count} already hot`
          : "Usual prices";

  const dateLabel = count === 1 ? "hot date" : `${count} hot dates`;
  const actionLabel = saving
    ? "Saving…"
    : count === 0
      ? "Save hot dates"
      : removing
        ? `Remove ${dateLabel}`
        : `Save ${dateLabel}`;

  function handleDatesChange(next: Date[] | undefined) {
    setDates(next);
    setDraft(buildDraft(catalog, priceMap, toSortedDateKeys(next)));
    setError(null);
  }

  async function handleSubmit() {
    if (count === 0) return;
    if (tooMany) {
      setError(`Choose up to ${MAX_DATE_RANGE_DAYS} dates at a time.`);
      return;
    }

    const overrides: (HotDateCatalogRow["target"] & { price: number | null })[] =
      [];
    for (const row of catalog) {
      const raw = (draft[row.key] ?? "").trim();
      if (raw === "") {
        overrides.push({ ...row.target, price: null });
        continue;
      }
      const price = Number(raw);
      if (!Number.isFinite(price) || price < 0) {
        setError(`Enter a valid price for ${row.label}.`);
        return;
      }
      overrides.push({ ...row.target, price });
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/hot-dates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: selectedKeys, overrides }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Failed to save hot dates."
        );
        return;
      }

      const selected = new Set(selectedKeys);
      const saved = ((data.hot_dates as HotDateLookup[] | undefined) ?? []).map(
        toHotDateItem
      );
      onSaved([
        ...hotDates.filter((item) => !selected.has(item.date)),
        ...saved,
      ]);
      router.replace("/dashboard/hot-dates", { scroll: false });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <BackButton fallbackHref="/dashboard/hot-dates" />

      <div>
        <h2 className="text-lg font-semibold">
          {editing ? "Edit hot dates" : "Add hot dates"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Charge special prices on busy dates
        </p>
      </div>

      <SettingsSection title="Pick dates">
        <div className={cn(glassCardClassName, "overflow-hidden")}>
          <DashboardCalendar
            mode="multiple"
            selected={dates}
            onSelect={handleDatesChange}
            defaultMonth={dates?.[0]}
            disabled={{ before: startOfToday() }}
            modifiers={{ hot: hotDays }}
            modifiersClassNames={{ hot: hotDayClassName }}
          />
          <p className="flex items-center gap-2 border-t border-white/50 px-4 py-3 text-xs text-muted-foreground dark:border-white/10">
            <span className="size-2.5 rounded-full bg-amber-500/50" />
            Hot date · tap dates to select or unselect them
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title="Prices">
        {catalog.length === 0 ? (
          <EmptyCard>
            {chargeBy === "package"
              ? "You have no events yet."
              : "You have no styles yet."}{" "}
            <Link
              href="/dashboard/settings/events"
              scroll={false}
              className="font-medium text-primary hover:underline"
            >
              Set them up in Settings
            </Link>
          </EmptyCard>
        ) : count === 0 ? (
          <EmptyCard>Pick dates to set their prices.</EmptyCard>
        ) : (
          <>
            <div className={settingsListClassName}>
              {catalog.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <RowText
                    title={row.label}
                    description={
                      hotDateIsExtraCharge
                        ? "Extra on top of the state price"
                        : `Usual ${formatRm(row.catalogPrice)}`
                    }
                  />
                  <div className="relative w-28 shrink-0">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted-foreground">
                      RM
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      className={inputClassName}
                      placeholder={
                        hotDateIsExtraCharge ? "0" : String(row.catalogPrice)
                      }
                      value={draft[row.key] ?? ""}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          [row.key]: event.target.value,
                        }))
                      }
                      disabled={saving}
                      aria-label={`Hot date price for ${row.label}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave a price blank to keep the usual price.
            </p>
          </>
        )}
      </SettingsSection>

      <SettingsSection title="Summary">
        <div className={settingsListClassName}>
          <SummaryRow
            label="Dates"
            value={formatDateKeysLabel(selectedKeys) ?? "None selected"}
          />
          <SummaryRow label="Days" value={count === 0 ? "—" : String(count)} />
          <SummaryRow label="Status" value={statusText} />
        </div>
      </SettingsSection>

      <SettingsFeedback
        error={
          error ??
          (tooMany ? `Choose up to ${MAX_DATE_RANGE_DAYS} dates at a time.` : null)
        }
      />
      <Button
        type="button"
        size="lg"
        variant={removing ? "outline" : "default"}
        className="min-h-11"
        onClick={() => void handleSubmit()}
        disabled={
          saving ||
          count === 0 ||
          tooMany ||
          catalog.length === 0 ||
          (removing && alreadyHot === 0)
        }
      >
        {actionLabel}
      </Button>
    </div>
  );
}
