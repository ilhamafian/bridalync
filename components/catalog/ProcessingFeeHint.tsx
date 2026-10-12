"use client";

import { usePaymentMethod } from "@/components/dashboard/PaymentMethodProvider";
import { cn } from "@/lib/utils";
import { formatRm, withClientFeesRm } from "@/utils/booking/pricing";

/**
 * What clients see for a price once the fees are added.
 * Hidden for manual-transfer stylists, whose clients pay no fee.
 */
export function ProcessingFeeHint({
  amountRm,
  includeFixed = true,
  className,
}: {
  amountRm: number | string | null | undefined;
  /** False for amounts added on top of another item, which already carries the RM1. */
  includeFixed?: boolean;
  className?: string;
}) {
  const { usesPaymentGateway } = usePaymentMethod();
  const amount = typeof amountRm === "string" ? Number(amountRm) : amountRm;
  if (!usesPaymentGateway || amount == null || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {formatRm(withClientFeesRm(amount, includeFixed))} after fee
    </p>
  );
}
