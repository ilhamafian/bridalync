"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconAdjustmentsHorizontal,
  IconCash,
  IconDownload,
  IconFileInvoice,
} from "@tabler/icons-react";

import { EmptyCard } from "@/components/dashboard/DashboardHome";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import { formatPaymentTime } from "@/components/dashboard/payments/format";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
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

function PaymentsList({ payments }: { payments: PaymentRecord[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (payments.length === 0) {
    return <EmptyCard>No payments received yet.</EmptyCard>;
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

function InvoicesList({ invoices }: { invoices: InvoiceItem[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (invoices.length === 0) {
    return <EmptyCard>Invoices appear here once a client pays.</EmptyCard>;
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

type PaymentSort = "newest" | "oldest" | "highest" | "lowest";

const PAYMENT_SORTS: { value: PaymentSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "highest", label: "Highest amount" },
  { value: "lowest", label: "Lowest amount" },
];

function sortItems<T>(
  items: T[],
  sort: PaymentSort,
  getTime: (item: T) => string,
  getAmount: (item: T) => number
) {
  const time = (item: T) => new Date(getTime(item)).getTime();
  return [...items].sort((a, b) => {
    switch (sort) {
      case "newest":
        return time(b) - time(a);
      case "oldest":
        return time(a) - time(b);
      case "highest":
        return getAmount(b) - getAmount(a) || time(b) - time(a);
      case "lowest":
        return getAmount(a) - getAmount(b) || time(b) - time(a);
    }
  });
}

export function PaymentsTabs({
  payments,
  invoices,
}: {
  payments: PaymentRecord[];
  invoices: InvoiceItem[];
}) {
  const [sort, setSort] = useState<PaymentSort>("newest");

  const sortedPayments = useMemo(
    () =>
      sortItems(
        payments,
        sort,
        (payment) => payment.at,
        (payment) => payment.amountRm
      ),
    [payments, sort]
  );
  const sortedInvoices = useMemo(
    () =>
      sortItems(
        invoices,
        sort,
        (invoice) => invoice.issuedAt,
        (invoice) => invoice.totalRm
      ),
    [invoices, sort]
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Sort payments"
              className="size-10 shrink-0 rounded-lg border border-zinc-900/10 bg-white/40 shadow-sm backdrop-blur-sm hover:bg-white/50 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <IconAdjustmentsHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-100 w-44 min-w-44">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => setSort(value as PaymentSort)}
            >
              {PAYMENT_SORTS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <TabsContent value="payments">
        <PaymentsList payments={sortedPayments} />
      </TabsContent>
      <TabsContent value="invoices">
        <InvoicesList invoices={sortedInvoices} />
      </TabsContent>
    </Tabs>
  );
}
