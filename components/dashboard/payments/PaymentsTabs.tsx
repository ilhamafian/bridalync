"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { IconCash, IconDownload, IconFileInvoice } from "@tabler/icons-react";

import { EmptyCard } from "@/components/dashboard/DashboardHome";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import { formatPaymentTime } from "@/components/dashboard/payments/format";
import {
  DateRangeChip,
  DateRangeFilter,
  isDateKeyInRange,
  type DateRange,
} from "@/components/dashboard/DateRangeFilter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toDateKey } from "@/utils/booking/availability";
import { formatDateRangeLabel } from "@/utils/booking/dateRange";
import { formatRm } from "@/utils/booking/pricing";
import {
  PAYMENT_KIND_LABELS,
  type InvoiceItem,
  type PaymentRecord,
} from "@/utils/payments";

const PAGE_SIZE = 10;

const rowLinkClassName =
  "flex min-w-0 flex-1 items-center gap-3 transition-colors focus-visible:outline-none";

const iconBadgeClassName =
  "flex size-9 shrink-0 items-center justify-center rounded-full bg-white/50 text-primary dark:bg-white/10";

function bookingHref(bookingId: string) {
  return `/dashboard/bookings/${encodeURIComponent(bookingId)}`;
}

function ShowMoreButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-center text-sm font-medium text-primary hover:underline"
    >
      Show more
    </button>
  );
}

function PaymentsList({
  payments,
  filtered,
}: {
  payments: PaymentRecord[];
  filtered: boolean;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (payments.length === 0) {
    return (
      <EmptyCard>
        {filtered
          ? "No payments in this date range."
          : "No payments received yet."}
      </EmptyCard>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={cn(glassCardClassName, "overflow-hidden")}>
        <ul className="divide-y divide-white/50 dark:divide-white/10">
          {payments.slice(0, visibleCount).map((payment) => (
            <li key={payment.id}>
              <Link
                href={bookingHref(payment.bookingId)}
                scroll={false}
                className={cn(
                  rowLinkClassName,
                  "px-4 py-3 hover:bg-white/20 focus-visible:bg-white/20 dark:hover:bg-white/5 dark:focus-visible:bg-white/5"
                )}
              >
                <span className={iconBadgeClassName}>
                  <IconCash className="size-4.5" aria-hidden />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate text-sm font-medium">
                    {payment.clientName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {PAYMENT_KIND_LABELS[payment.kind]} · {payment.packageName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPaymentTime(payment.at)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  +{formatRm(payment.amountRm)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {visibleCount < payments.length ? (
        <ShowMoreButton
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        />
      ) : null}
    </div>
  );
}

function InvoicesList({
  invoices,
  filtered,
}: {
  invoices: InvoiceItem[];
  filtered: boolean;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (invoices.length === 0) {
    return (
      <EmptyCard>
        {filtered
          ? "No invoices in this date range."
          : "Invoices appear here once a client pays."}
      </EmptyCard>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={cn(glassCardClassName, "overflow-hidden")}>
        <ul className="divide-y divide-white/50 dark:divide-white/10">
          {invoices.slice(0, visibleCount).map((invoice) => {
            const fullyPaid = invoice.paidRm >= invoice.totalRm;
            return (
              <li
                key={invoice.bookingId}
                className="flex items-center gap-2 py-3 pr-3 pl-4"
              >
                <Link
                  href={bookingHref(invoice.bookingId)}
                  scroll={false}
                  className={rowLinkClassName}
                >
                  <span className={iconBadgeClassName}>
                    <IconFileInvoice className="size-4.5" aria-hidden />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-sm font-medium">
                      #{invoice.invoiceNumber} · {invoice.clientName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {invoice.packageName}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {fullyPaid
                        ? `${formatRm(invoice.totalRm)} paid`
                        : `${formatRm(invoice.paidRm)} of ${formatRm(invoice.totalRm)} paid`}
                    </p>
                  </div>
                </Link>
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 rounded-full border border-zinc-900/10 bg-white/40 backdrop-blur-sm hover:bg-white/50 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15"
                >
                  <a
                    href={`/api/bookings/${encodeURIComponent(invoice.bookingId)}/invoice`}
                    download
                    aria-label={`Download invoice #${invoice.invoiceNumber}`}
                  >
                    <IconDownload className="size-4.5" />
                  </a>
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
      {visibleCount < invoices.length ? (
        <ShowMoreButton
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        />
      ) : null}
    </div>
  );
}

function filterNewestFirst<T>(
  items: T[],
  range: DateRange | undefined,
  getTime: (item: T) => string
) {
  const time = (item: T) => new Date(getTime(item)).getTime();
  return items
    .filter((item) => isDateKeyInRange(toDateKey(getTime(item)), range))
    .sort((a, b) => time(b) - time(a));
}

export function PaymentsTabs({
  payments,
  invoices,
}: {
  payments: PaymentRecord[];
  invoices: InvoiceItem[];
}) {
  const [range, setRange] = useState<DateRange | undefined>();
  const filtered = Boolean(range?.from);
  const rangeKey = formatDateRangeLabel(range) ?? "all";

  const visiblePayments = useMemo(
    () => filterNewestFirst(payments, range, (payment) => payment.at),
    [payments, range]
  );
  const visibleInvoices = useMemo(
    () => filterNewestFirst(invoices, range, (invoice) => invoice.issuedAt),
    [invoices, range]
  );

  return (
    <Tabs defaultValue="payments" className="gap-3">
      <div className="flex items-center gap-2">
        <TabsList className="h-10! min-w-0 flex-1 bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm dark:bg-white/10 dark:ring-white/15">
          <TabsTrigger value="payments" className="text-sm">
            Payments
          </TabsTrigger>
          <TabsTrigger value="invoices" className="text-sm">
            Invoices
          </TabsTrigger>
        </TabsList>
        <DateRangeFilter
          label="Filter payments by date range"
          value={range}
          onChange={setRange}
        />
      </div>
      <DateRangeChip value={range} onClear={() => setRange(undefined)} />
      <TabsContent value="payments">
        <PaymentsList
          key={rangeKey}
          payments={visiblePayments}
          filtered={filtered}
        />
      </TabsContent>
      <TabsContent value="invoices">
        <InvoicesList
          key={rangeKey}
          invoices={visibleInvoices}
          filtered={filtered}
        />
      </TabsContent>
    </Tabs>
  );
}
