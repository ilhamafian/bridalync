"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { SessionForm } from "@/schemas/sessionSchema"
import { BookingQuotationSummary, formatRm } from "@/utils/booking/pricing"
import { formatLocationAddress, formatSessionSummary } from "@/utils/session"
import { cn } from "@/lib/utils"

type BookingQuotationProps = {
  quotation: BookingQuotationSummary
  sessions?: SessionForm[]
  companyName?: string
  balanceDueBeforeDays?: number
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

type BookingInvoiceProps = {
  invoice: BookingQuotationSummary
  companyName?: string
  balanceDueBeforeDays?: number
  className?: string
}

export function BookingInvoice({
  invoice,
  companyName,
  balanceDueBeforeDays,
  className,
}: BookingInvoiceProps) {
  return (
    <Card
      className={cn(
        "mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80",
        className
      )}
    >
      <CardContent className="flex flex-col gap-4 pt-(--card-spacing)">
        <div>
          <p className="text-sm font-medium text-foreground">
            {companyName ? companyName : "Invoice"}
          </p>
          <p className="text-xs text-muted-foreground">Payment summary</p>
        </div>

        {invoice.lineItems.length > 0 ? (
          <div className="space-y-2 border-b border-border pb-4">
            {invoice.lineItems.map((item) => (
              <InvoiceRow
                key={item.label}
                label={item.label}
                amount={formatRm(item.amountRm)}
              />
            ))}
          </div>
        ) : (
          <p className="border-b border-border pb-4 text-sm text-muted-foreground">
            No line items.
          </p>
        )}

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
          {balanceDueBeforeDays != null && (
            <p className="text-xs text-muted-foreground">
              Balance due {balanceDueBeforeDays} day
              {balanceDueBeforeDays === 1 ? "" : "s"} before your session.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function BookingQuotation({
  quotation,
  sessions = [],
  companyName,
  balanceDueBeforeDays,
  className,
}: BookingQuotationProps) {
  const sortedSessions = [...sessions].sort((a, b) => a.order - b.order)

  return (
    <Card
      className={cn(
        "mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80",
        className
      )}
    >
      <CardContent className="flex flex-col gap-4 pt-(--card-spacing)">
        <div>
          <p className="text-sm font-medium text-foreground">
            {companyName ? companyName : "Quotation"}
          </p>
          <p className="text-xs text-muted-foreground">
            Review your total before confirming.
          </p>
        </div>

        {sortedSessions.length > 0 && (
          <div className="space-y-2 border-b border-border pb-4">
            <p className="text-sm font-medium text-foreground">Sessions</p>
            <ul className="flex flex-col gap-2">
              {sortedSessions.map((session) => (
                <li
                  key={session.client_key}
                  className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
                >
                  <p className="font-medium text-foreground">
                    {formatSessionSummary(session)}
                  </p>
                  {session.location && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatLocationAddress(session.location)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {quotation.lineItems.length > 0 ? (
          <div className="space-y-2 border-b border-border pb-4">
            {quotation.lineItems.map((item) => (
              <InvoiceRow
                key={item.label}
                label={item.label}
                amount={formatRm(item.amountRm)}
              />
            ))}
          </div>
        ) : (
          <p className="border-b border-border pb-4 text-sm text-muted-foreground">
            No line items yet.
          </p>
        )}

        <div className="space-y-2">
          <InvoiceRow
            label="Total"
            amount={formatRm(quotation.totalRm)}
            emphasis
          />
          <InvoiceRow
            label="Deposit"
            amount={formatRm(quotation.depositRm)}
            emphasis
          />
          <div className="flex items-start justify-between gap-3 border-t border-border pt-3 text-sm font-semibold text-foreground">
            <span>Balance payment</span>
            <span>{formatRm(quotation.balanceRm)}</span>
          </div>
          {balanceDueBeforeDays != null && (
            <p className="text-xs text-muted-foreground">
              Balance due {balanceDueBeforeDays} day
              {balanceDueBeforeDays === 1 ? "" : "s"} before your session.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
