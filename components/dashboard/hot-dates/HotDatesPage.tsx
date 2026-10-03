"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import { IconFlame, IconPlus, IconTrash } from "@tabler/icons-react";

import { BackButton } from "@/components/dashboard/BackButton";
import { parseDateKey } from "@/components/dashboard/DashboardCalendar";
import { EmptyCard } from "@/components/dashboard/DashboardHome";
import {
  DateRangeChip,
  DateRangeFilter,
  isDateKeyInRange,
} from "@/components/dashboard/DateRangeFilter";
import {
  IconBadge,
  RowText,
  SettingsFeedback,
  SettingsSection,
  settingsListClassName,
  settingsRowClassName,
} from "@/components/dashboard/settings/SettingsUi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toDateKey } from "@/utils/booking/availability";
import {
  chunkDateKeys,
  formatDateKeyRangeSpan,
  formatDateKeyRangeTitle,
} from "@/utils/booking/dateRange";
import {
  groupHotDateRanges,
  hotDateTargetKey,
  type HotDateCatalogRow,
  type HotDateRange,
} from "@/utils/booking/hotDates";
import { formatRm } from "@/utils/booking/pricing";
import type { HotDateItem } from "@/utils/dashboardShell";

function formatPrices(range: HotDateRange) {
  if (range.prices.length === 1) {
    const [{ row, price }] = range.prices;
    return `${row.label} ${formatRm(price)}`;
  }
  const lowest = Math.min(...range.prices.map(({ price }) => price));
  return `${range.prices.length} prices · from ${formatRm(lowest)}`;
}

function formatRangeDescription(range: HotDateRange) {
  const span = formatDateKeyRangeSpan(range.start, range.end, range.dates.length);
  return span ? `${span} · ${formatPrices(range)}` : formatPrices(range);
}

function RemoveButton({
  title,
  disabled,
  onConfirm,
}: {
  title: string;
  disabled: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          disabled={disabled}
          aria-label={`Remove hot date ${title}`}
        >
          <IconTrash />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove hot date {title}?</AlertDialogTitle>
          <AlertDialogDescription>
            Clients will be charged your usual prices on these dates again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function HotDatesPage({
  hotDates,
  catalog,
  onHotDatesChange,
  onOpenDraft,
}: {
  hotDates: HotDateItem[];
  catalog: HotDateCatalogRow[];
  onHotDatesChange: (hotDates: HotDateItem[]) => void;
  /** Prepares the add page, optionally preselecting an existing range to edit. */
  onOpenDraft: (range?: DateRange) => void;
}) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange | undefined>();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const filtered = Boolean(range?.from);

  const ranges = useMemo(() => {
    const today = toDateKey(new Date());
    return groupHotDateRanges(
      hotDates.filter((item) =>
        range?.from ? isDateKeyInRange(item.date, range) : item.date >= today
      ),
      catalog
    );
  }, [hotDates, catalog, range]);

  function handleEdit(hotRange: HotDateRange) {
    onOpenDraft({
      from: parseDateKey(hotRange.start),
      to: parseDateKey(hotRange.end),
    });
    router.push("/dashboard/hot-dates/new", { scroll: false });
  }

  async function handleRemove(hotRange: HotDateRange) {
    setBusyKey(hotRange.start);
    setError(null);
    setSuccess(null);

    const removed = new Set(hotRange.dates);
    const targets = new Map<string, HotDateItem>();
    for (const item of hotDates) {
      const key = hotDateTargetKey(item);
      if (key && removed.has(item.date)) targets.set(key, item);
    }
    const overrides = [...targets.values()].map((item) =>
      item.package_id
        ? { package_id: item.package_id, price: null }
        : {
            style_id: item.style_id,
            variant_order: item.variant_order,
            price: null,
          }
    );

    try {
      for (const dates of chunkDateKeys(hotRange.dates)) {
        const response = await fetch("/api/hot-dates", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dates, overrides }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(
            typeof data.error === "string"
              ? data.error
              : "Could not remove hot dates."
          );
          return;
        }
      }

      onHotDatesChange(hotDates.filter((item) => !removed.has(item.date)));
      setSuccess(
        hotRange.dates.length === 1
          ? "Hot date removed."
          : `${hotRange.dates.length} hot dates removed.`
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <BackButton />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Hot dates</h2>
          <p className="text-sm text-muted-foreground">
            Special prices for your busiest days
          </p>
        </div>
        <Button
          asChild
          size="lg"
          className="shrink-0 rounded-full px-3"
        >
          <Link
            href="/dashboard/hot-dates/new"
            scroll={false}
            onClick={() => onOpenDraft()}
          >
            <IconPlus data-icon="inline-start" />
            Add
          </Link>
        </Button>
      </div>

      <SettingsFeedback error={error} success={success} />

      <SettingsSection
        title={filtered ? "In date range" : "Upcoming"}
        action={
          <DateRangeFilter
            label="Filter hot dates by date range"
            value={range}
            onChange={setRange}
          />
        }
      >
        <DateRangeChip value={range} onClear={() => setRange(undefined)} />
        {ranges.length === 0 ? (
          <EmptyCard>
            {filtered
              ? "No hot dates in this date range."
              : "No upcoming hot dates."}
          </EmptyCard>
        ) : (
          <ul className={settingsListClassName}>
            {ranges.map((hotRange) => {
              const title = formatDateKeyRangeTitle(hotRange.start, hotRange.end);
              return (
                <li key={hotRange.start} className="flex items-center pr-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(hotRange)}
                    className={settingsRowClassName}
                    aria-label={`Edit hot date ${title}`}
                  >
                    <IconBadge icon={IconFlame} />
                    <RowText
                      title={title}
                      description={formatRangeDescription(hotRange)}
                    />
                  </button>
                  <RemoveButton
                    title={title}
                    disabled={busyKey === hotRange.start}
                    onConfirm={() => void handleRemove(hotRange)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </SettingsSection>
    </div>
  );
}
