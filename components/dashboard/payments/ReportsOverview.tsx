"use client";

import { useState } from "react";

import { FilterPills } from "@/components/dashboard/FilterPills";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import { RevenueLineChart } from "@/components/dashboard/payments/RevenueLineChart";
import { formatRmShort } from "@/components/dashboard/payments/format";
import { cn } from "@/lib/utils";
import type { MonthlyReport } from "@/utils/payments";

export function ReportsOverview({ reports }: { reports: MonthlyReport[] }) {
  const [selectedKey, setSelectedKey] = useState(reports[0]?.key ?? "");
  const report =
    reports.find((item) => item.key === selectedKey) ?? reports[0] ?? null;

  if (!report) return null;

  return (
    <div className="flex flex-col gap-3">
      <FilterPills
        label="Select month"
        options={reports.map((item) => ({ value: item.key, label: item.label }))}
        value={report.key}
        onChange={setSelectedKey}
      />
      <div className={cn(glassCardClassName, "flex flex-col gap-3 p-4")}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="text-xs text-muted-foreground">
            {report.paymentCount} payment{report.paymentCount === 1 ? "" : "s"}
          </p>
        </div>
        <p className="-mt-2 text-2xl font-semibold tabular-nums">
          {formatRmShort(report.totalRm)}
        </p>
        <RevenueLineChart
          dailyRm={report.dailyRm}
          daysInMonth={report.daysInMonth}
        />
      </div>
    </div>
  );
}
