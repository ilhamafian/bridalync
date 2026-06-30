"use client"

import { Card, CardContent } from "@/components/ui/card"
import { formatRm, type BookingInvoiceSummary } from "@/lib/booking/pricing"
import { cn } from "@/lib/utils"

type BookingInvoiceProps = {
  invoice: BookingInvoiceSummary
  className?: string
}

function InvoiceRow({
  label,
  amount,
  emphasis = false,
}: {
  label: string
  amount: string
  emphasis?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 text-sm",
        emphasis && "font-medium text-foreground"
      )}
    >
      <span className={emphasis ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      <span className="shrink-0 text-foreground">{amount}</span>
    </div>
  )
}

export function BookingInvoice({ invoice, className }: BookingInvoiceProps) {
  return (
    <Card
      className={cn(
        "mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80",
        className
      )}
    >
      <CardContent className="flex flex-col gap-4 pt-(--card-spacing)">
        <div>
          <p className="text-sm font-medium text-foreground">Invoice</p>
          <p className="text-xs text-muted-foreground">
            Review your total before confirming.
          </p>
        </div>

        <div className="space-y-2 border-b border-border pb-4">
          {invoice.lineItems.map((item) => (
            <InvoiceRow
              key={item.label}
              label={item.label}
              amount={formatRm(item.amountRm)}
            />
          ))}
        </div>

        <div className="space-y-2">
          <InvoiceRow
            label="Total"
            amount={formatRm(invoice.totalRm)}
            emphasis
          />
          <InvoiceRow
            label="Deposit"
            amount={formatRm(invoice.depositRm)}
            emphasis
          />
          <div className="flex items-start justify-between gap-3 border-t border-border pt-3 text-sm font-semibold text-foreground">
            <span>Balance payment</span>
            <span>{formatRm(invoice.balanceRm)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
