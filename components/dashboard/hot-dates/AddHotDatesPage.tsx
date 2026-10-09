"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ProcessingFeeHint } from "@/components/catalog/ProcessingFeeHint";
import { BackButton } from "@/components/dashboard/BackButton";
import { SummaryRow } from "@/components/dashboard/blocked/SummaryRow";
import {
  DashboardCalendar,
  hotDayClassName,
  parseDateKey,
} from "@/components/dashboard/DashboardCalendar";
import { EmptyCard } from "@/components/dashboard/DashboardHome";
import { useStyleTerms } from "@/components/dashboard/StyleTermsProvider";
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
  MAX_HOT_DATE_PERCENT,
  type HotDatePriceType,
} from "@/schemas/hotDateSchema";
import {
  buildHotDateRowPriceMap,
  resolveHotDatePrice,
  toHotDateItem,
  type HotDateCatalogRow,
  type HotDateLookup,
  type HotDateRate,
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

const PRICE_TYPE_OPTIONS: { value: HotDatePriceType; label: string }[] = [
  { value: "fixed", label: "RM" },
  { value: "percent", label: "%" },
];

type Draft = { priceType: HotDatePriceType; values: Record<string, string> };

/**
 * Prefills each row with its rate when every selected date shares it, else blank. The price type follows the first
 * prefilled row; rows set with the other type start blank.
 */
function buildDraft(
  catalog: HotDateCatalogRow[],
  priceMap: Map<string, HotDateRate>,
  dateKeys: string[]
): Draft {
  const shared = new Map<string, HotDateRate>();
  if (dateKeys.length > 0) {
    for (const row of catalog) {
      const rates = dateKeys.map((date) => priceMap.get(`${date}|${row.key}`));
      const first = rates[0];
      if (
        first &&
        rates.every(
          (rate) => rate?.type === first.type && rate.price === first.price
        )
      ) {
        shared.set(row.key, first);
      }
    }
  }

  const priceType = shared.values().next().value?.type ?? "fixed";
  const values: Record<string, string> = {};
  for (const row of catalog) {
    const rate = shared.get(row.key);
    values[row.key] = rate && rate.type === priceType ? String(rate.price) : "";
  }
  return { priceType, values };
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
  const styleTerms = useStyleTerms();
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
  const { priceType, values } = draft;
  const isPercent = priceType === "percent";
  const pricedRows = catalog.filter((row) => (values[row.key] ?? "").trim() !== "");
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

    const overrides: (HotDateCatalogRow["target"] & {
      price: number | null;
      price_type?: HotDatePriceType;
    })[] = [];
    for (const row of catalog) {
      const raw = (values[row.key] ?? "").trim();
      if (raw === "") {
        overrides.push({ ...row.target, price: null });
        continue;
      }
      const price = Number(raw);
      if (!Number.isFinite(price) || price < 0) {
        setError(
          isPercent
            ? `Enter a valid percentage for ${row.label}.`
            : `Enter a valid price for ${row.label}.`
        );
        return;
      }
      if (isPercent && price > MAX_HOT_DATE_PERCENT) {
        setError(`A percentage increase can be at most ${MAX_HOT_DATE_PERCENT}%.`);
        return;
      }
      overrides.push({ ...row.target, price, price_type: priceType });
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
              : `You have no ${styleTerms.many} yet.`}{" "}
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
              <div className="flex items-center gap-3 px-4 py-3">
                <RowText
                  title="Increase by"
                  description={
                    isPercent
                      ? hotDateIsExtraCharge
                        ? "A percentage of the state price"
                        : "A percentage of the usual price"
                      : hotDateIsExtraCharge
                        ? "A fixed amount in RM"
                        : "A new price in RM"
                  }
                />
                <div
                  className="flex h-10 shrink-0 rounded-md border border-border bg-white/60 p-0.5 dark:bg-white/5"
                  role="radiogroup"
                  aria-label="Increase by"
                >
                  {PRICE_TYPE_OPTIONS.map((option) => {
                    const selected = option.value === priceType;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={saving}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            priceType: option.value,
                          }))
                        }
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
            </div>
            <div className={settingsListClassName}>
              {catalog.map((row) => {
                const raw = (values[row.key] ?? "").trim();
                const amount = raw === "" ? NaN : Number(raw);
                const hotPriceRm =
                  Number.isFinite(amount) && amount >= 0
                    ? isPercent
                      ? hotDateIsExtraCharge
                        ? null
                        : resolveHotDatePrice(row.catalogPrice, {
                            price: amount,
                            type: "percent",
                          })
                      : amount
                    : null;
                return (
                  <div key={row.key} className="flex flex-col gap-1 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <RowText
                        title={row.label}
                        description={
                          hotDateIsExtraCharge
                            ? "Increase in price from the state price"
                            : isPercent && hotPriceRm !== null
                              ? `Usual ${formatRm(row.catalogPrice)} → ${formatRm(hotPriceRm)}`
                              : `Usual ${formatRm(row.catalogPrice)}`
                        }
                      />
                      <div className="relative w-28 shrink-0">
                        <span
                          className={cn(
                            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground",
                            isPercent ? "right-3" : "left-3"
                          )}
                        >
                          {isPercent ? "%" : "RM"}
                        </span>
                        <Input
                          type="number"
                          min={0}
                          max={isPercent ? MAX_HOT_DATE_PERCENT : undefined}
                          step={1}
                          inputMode="numeric"
                          className={cn(
                            inputClassName,
                            isPercent && "pr-8 pl-3"
                          )}
                          placeholder={
                            isPercent || hotDateIsExtraCharge
                              ? "0"
                              : String(row.catalogPrice)
                          }
                          value={values[row.key] ?? ""}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              values: {
                                ...current.values,
                                [row.key]: event.target.value,
                              },
                            }))
                          }
                          disabled={saving}
                          aria-label={
                            isPercent
                              ? `Hot date increase (%) for ${row.label}`
                              : `Hot date price for ${row.label}`
                          }
                        />
                      </div>
                    </div>
                    <ProcessingFeeHint
                      amountRm={hotPriceRm}
                      includeFixed={!hotDateIsExtraCharge}
                    />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave a field blank to keep the usual price.
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
