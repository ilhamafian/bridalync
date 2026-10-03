"use client";

import Link from "next/link";
import {
  IconBrandWhatsapp,
  IconChevronRight,
  IconCircleCheck,
} from "@tabler/icons-react";

import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatRm } from "@/utils/booking/pricing";

export type OutstandingClientRow = {
  bookingId: string;
  clientName: string;
  packageName: string;
  sessionDate: string;
  balanceRm: number;
  /** WhatsApp link with a pre-filled balance reminder; null without a phone. */
  messageUrl: string | null;
};

function formatSessionDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function MessageButton({ url }: { url: string | null }) {
  if (!url) {
    return (
      <Button
        size="sm"
        className="flex-none gap-1.5"
        disabled
        title="This client has no phone number"
      >
        <IconBrandWhatsapp className="size-4" />
        Message
      </Button>
    );
  }

  return (
    <Button asChild size="sm" className="flex-none gap-1.5">
      <a href={url} target="_blank" rel="noopener noreferrer">
        <IconBrandWhatsapp className="size-4" />
        Message
      </a>
    </Button>
  );
}

export function OutstandingPaymentsCard({
  totalRm,
  clients,
}: {
  totalRm: number;
  clients: OutstandingClientRow[];
}) {
  const summary = (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-semibold tabular-nums">
          {formatRm(totalRm)}
        </p>
        <p className="text-sm text-muted-foreground">
          {clients.length === 0
            ? "All clients are paid up this month"
            : `${clients.length} client${clients.length === 1 ? "" : "s"} still to pay this month`}
        </p>
      </div>
      {clients.length === 0 ? (
        <IconCircleCheck className="size-6 shrink-0 text-primary" aria-hidden />
      ) : (
        <IconChevronRight
          className="size-5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      )}
    </>
  );

  if (clients.length === 0) {
    return (
      <div className={cn(glassCardClassName, "flex items-center gap-3 p-4")}>
        {summary}
      </div>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            glassCardClassName,
            "flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-white/40 dark:hover:bg-white/15"
          )}
        >
          {summary}
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        contained
        overlayClassName="bg-black/10 supports-backdrop-filter:backdrop-blur-[2px]"
        className="max-h-[85%] rounded-t-2xl border-white/60 bg-white/80 backdrop-blur-xl dark:border-white/15 dark:bg-zinc-950/75"
      >
        <SheetHeader className="pb-2">
          <SheetTitle>Outstanding payments</SheetTitle>
          <SheetDescription>
            {formatRm(totalRm)} unpaid for sessions this month
          </SheetDescription>
        </SheetHeader>
        <ul className="flex flex-col gap-1 overflow-y-auto px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {clients.map((client) => (
            <li
              key={client.bookingId}
              className="flex items-center gap-3 rounded-xl px-3 py-3"
            >
              <SheetClose asChild>
                <Link
                  href={`/dashboard/bookings/${encodeURIComponent(client.bookingId)}`}
                  scroll={false}
                  className="flex min-w-0 flex-1 flex-col gap-0.5"
                >
                  <span className="truncate text-sm font-medium">
                    {client.clientName}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {formatSessionDate(client.sessionDate)} ·{" "}
                    {client.packageName}
                  </span>
                  <span className="text-xs font-semibold tabular-nums">
                    {formatRm(client.balanceRm)} due
                  </span>
                </Link>
              </SheetClose>
              <MessageButton url={client.messageUrl} />
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
