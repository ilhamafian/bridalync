"use client";

import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import type { PackageItem, StyleItem } from "@/components/PackagesManager";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PublicHotDate } from "@/schemas/hotDateSchema";
import {
  dateKeysFromRange,
  formatDateRangeLabel,
  MAX_DATE_RANGE_DAYS,
} from "@/utils/booking/dateRange";
import { formatRm } from "@/utils/booking/pricing";

type HotDateRow = {
  _id?: string;
  date: string;
  package_id?: string;
  style_id?: string;
  variant_order?: number;
  price: number;
};

type CatalogRow =
  | {
      key: string;
      kind: "package";
      label: string;
      packageId: string;
      catalogPrice: number;
    }
  | {
      key: string;
      kind: "style";
      label: string;
      styleId: string;
      variantOrder: number;
      catalogPrice: number;
    };

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

function overrideValueForRow(
  row: CatalogRow,
  hotDates: HotDateRow[],
  dateKey: string
): number | undefined {
  if (row.kind === "package") {
    return hotDates.find(
      (item) => item.date === dateKey && item.package_id === row.packageId
    )?.price;
  }

  return hotDates.find(
    (item) =>
      item.date === dateKey &&
      item.style_id === row.styleId &&
      item.variant_order === row.variantOrder
  )?.price;
}

function buildCatalogRows(
  chargeBy: "package" | "style",
  packages: PackageItem[],
  styles: StyleItem[]
): CatalogRow[] {
  if (chargeBy === "package") {
    return [...packages]
      .sort((a, b) => a.order - b.order)
      .filter((pkg) => typeof pkg.price === "number")
      .map((pkg) => ({
        key: `package:${pkg._id}`,
        kind: "package" as const,
        label: pkg.name,
        packageId: pkg._id,
        catalogPrice: pkg.price ?? 0,
      }));
  }

  return [...styles]
    .sort((a, b) => a.order - b.order)
    .flatMap((style) =>
      [...style.variants]
        .sort((a, b) => a.order - b.order)
        .map((variant) => ({
          key: `style:${style._id}:${variant.order}`,
          kind: "style" as const,
          label: `${style.name} — ${variant.name}`,
          styleId: style._id,
          variantOrder: variant.order,
          catalogPrice: variant.price,
        }))
    );
}

export function HotDatesManager({
  chargeBy,
  packages,
  styles,
  initialHotDates = [],
  hideHeader = false,
  onSaved,
}: {
  chargeBy: "package" | "style";
  packages: PackageItem[];
  styles: StyleItem[];
  initialHotDates?: PublicHotDate[];
  hideHeader?: boolean;
  onSaved?: () => void;
}) {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [hotDates, setHotDates] = useState<HotDateRow[]>(initialHotDates);
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const catalogRows = useMemo(
    () => buildCatalogRows(chargeBy, packages, styles),
    [chargeBy, packages, styles]
  );

  const selectedDateKeys = useMemo(
    () => dateKeysFromRange(selectedRange),
    [selectedRange]
  );
  const templateDateKey = selectedDateKeys[0] ?? null;

  const markedDates = useMemo(() => {
    const keys = new Set(hotDates.map((item) => item.date));
    return [...keys]
      .map((key) => {
        const [year, month, day] = key.split("-").map(Number);
        return new Date(year, month - 1, day, 12, 0, 0, 0);
      })
      .filter((date) => !Number.isNaN(date.getTime()));
  }, [hotDates]);

  useEffect(() => {
    let cancelled = false;

    async function loadHotDates() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/hot-dates");
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (!cancelled) {
            setError(
              typeof data.error === "string"
                ? data.error
                : "Failed to load hot dates."
            );
          }
          return;
        }
        if (!cancelled) {
          setHotDates((data.hot_dates as HotDateRow[]) ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadHotDates();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!templateDateKey) {
      setDraftPrices({});
      return;
    }

    const next: Record<string, string> = {};
    for (const row of catalogRows) {
      const values = selectedDateKeys.map((dateKey) =>
        overrideValueForRow(row, hotDates, dateKey)
      );
      const first = values[0];
      const allMatch = values.every((value) => value === first);
      next[row.key] =
        allMatch && first !== undefined ? String(first) : "";
    }
    setDraftPrices(next);
    setSuccess(null);
    setError(null);
  }, [templateDateKey, selectedDateKeys, catalogRows, hotDates]);

  async function handleSave() {
    if (selectedDateKeys.length === 0) return;
    if (selectedDateKeys.length > MAX_DATE_RANGE_DAYS) {
      setError(`Choose up to ${MAX_DATE_RANGE_DAYS} days at a time.`);
      return;
    }

    const overrides: Array<{
      package_id?: string;
      style_id?: string;
      variant_order?: number;
      price: number | null;
    }> = [];

    for (const row of catalogRows) {
      const raw = (draftPrices[row.key] ?? "").trim();
      if (raw === "") {
        if (row.kind === "package") {
          overrides.push({ package_id: row.packageId, price: null });
        } else {
          overrides.push({
            style_id: row.styleId,
            variant_order: row.variantOrder,
            price: null,
          });
        }
        continue;
      }

      const price = Number(raw);
      if (!Number.isFinite(price) || price < 0) {
        setError(`Invalid price for ${row.label}.`);
        return;
      }

      if (row.kind === "package") {
        overrides.push({ package_id: row.packageId, price });
      } else {
        overrides.push({
          style_id: row.styleId,
          variant_order: row.variantOrder,
          price,
        });
      }
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/hot-dates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dates: selectedDateKeys,
          overrides,
        }),
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

      const savedForRange = (data.hot_dates as HotDateRow[]) ?? [];
      const selected = new Set(selectedDateKeys);
      setHotDates((current) => [
        ...current.filter((item) => !selected.has(item.date)),
        ...savedForRange,
      ]);
      setSuccess(
        selectedDateKeys.length === 1
          ? "Hot date prices saved."
          : `Hot date prices saved for ${selectedDateKeys.length} dates.`
      );
      onSaved?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {hideHeader ? null : (
        <div>
          <h2 className="text-lg font-semibold">Hot Dates</h2>
          <p className="text-sm text-muted-foreground">
            Set a higher price for a specific date. Leave blank to keep the
            catalog price.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card className="w-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pick dates</CardTitle>
            <CardDescription>
              Tap a start and end date. Dates with overrides are highlighted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="range"
              selected={selectedRange}
              onSelect={setSelectedRange}
              numberOfMonths={1}
              modifiers={{ hot: markedDates }}
              modifiersClassNames={{
                hot: "bg-primary/15 text-primary font-medium",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {formatDateRangeLabel(selectedRange) ?? "Select dates"}
            </CardTitle>
            <CardDescription>
              {chargeBy === "package"
                ? selectedDateKeys.length > 1
                  ? `Override package prices for these ${selectedDateKeys.length} dates.`
                  : "Override package prices for this date."
                : selectedDateKeys.length > 1
                  ? `Override style prices for these ${selectedDateKeys.length} dates.`
                  : "Override style prices for this date."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            {success ? (
              <p className="text-sm text-rose-700 dark:text-rose-400">
                {success}
              </p>
            ) : null}
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : null}

            {selectedDateKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Choose a date, then tap another date to select the range.
              </p>
            ) : catalogRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {chargeBy === "package"
                  ? "Add priced packages first."
                  : "Add styles with variants first."}
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {catalogRows.map((row) => (
                    <div
                      key={row.key}
                      className="grid gap-1.5 sm:grid-cols-[1fr_10rem] sm:items-end"
                    >
                      <div className="flex flex-col gap-1">
                        <Label htmlFor={`hot-${row.key}`}>{row.label}</Label>
                        <p className="text-xs text-muted-foreground">
                          Catalog {formatRm(row.catalogPrice)}
                        </p>
                      </div>
                      <Input
                        id={`hot-${row.key}`}
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        className={inputClassName}
                        placeholder={String(row.catalogPrice)}
                        value={draftPrices[row.key] ?? ""}
                        onChange={(event) =>
                          setDraftPrices((current) => ({
                            ...current,
                            [row.key]: event.target.value,
                          }))
                        }
                        disabled={saving}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving
                      ? "Saving…"
                      : selectedDateKeys.length === 1
                        ? "Save hot date"
                        : `Save ${selectedDateKeys.length} hot dates`}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
