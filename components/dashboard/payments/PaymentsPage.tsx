import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import {
  OutstandingPaymentsCard,
  type OutstandingClientRow,
} from "@/components/dashboard/payments/OutstandingPaymentsCard";
import { PaymentsTabs } from "@/components/dashboard/payments/PaymentsTabs";
import { ReportsOverview } from "@/components/dashboard/payments/ReportsOverview";
import { formatRmShort } from "@/components/dashboard/payments/format";
import { cn } from "@/lib/utils";
import type {
  InvoiceItem,
  MonthlyReport,
  PaymentRecord,
  WeekSummary,
} from "@/utils/payments";

export type PaymentsPageProps = {
  week: WeekSummary;
  outstanding: { totalRm: number; clients: OutstandingClientRow[] };
  reports: MonthlyReport[];
  recentPayments: PaymentRecord[];
  invoices: InvoiceItem[];
};

function WeekStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-0.5 px-2 py-4 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function PaymentsPage({
  week,
  outstanding,
  reports,
  recentPayments,
  invoices,
}: PaymentsPageProps) {
  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <section className="pr-12">
        <h2 className="text-xl font-semibold tracking-tight">Payments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your revenue, unpaid balances and invoices.
        </p>
      </section>

      <section className="-mt-2 flex flex-col gap-3">
        <h3 className="text-sm font-medium">This week</h3>
        <div
          className={cn(
            glassCardClassName,
            "grid grid-cols-3 divide-x divide-white/50 dark:divide-white/10"
          )}
        >
          <WeekStat label="Revenue" value={formatRmShort(week.revenueRm)} />
          <WeekStat label="Payments" value={String(week.paymentCount)} />
          <WeekStat label="Clients" value={String(week.clientCount)} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Outstanding payments</h3>
        <OutstandingPaymentsCard
          totalRm={outstanding.totalRm}
          clients={outstanding.clients}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Reports overview</h3>
        <ReportsOverview reports={reports} />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Payments</h3>
        <PaymentsTabs payments={recentPayments} invoices={invoices} />
      </section>
    </div>
  );
}
