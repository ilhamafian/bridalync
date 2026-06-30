import {
  BOOKING_ADD_ONS,
  BOOKING_DEPOSIT_RM,
  type BookingPackageId,
} from "@/lib/booking/constants";
import { getPackageById } from "@/lib/booking/utils";
import type { AddOnsSelection } from "@/lib/schemas/booking";

export type InvoiceLineItem = {
  label: string;
  amountRm: number;
};

export type BookingInvoiceSummary = {
  lineItems: InvoiceLineItem[];
  totalRm: number;
  depositRm: number;
  balanceRm: number;
};

export function formatRm(amount: number) {
  return `RM${amount.toLocaleString("en-MY")}`;
}

export function calculateBookingInvoice(
  packageId: BookingPackageId,
  addOns: AddOnsSelection
): BookingInvoiceSummary {
  const pkg = getPackageById(packageId);
  const lineItems: InvoiceLineItem[] = [];

  if (pkg) {
    lineItems.push({
      label: pkg.label,
      amountRm: pkg.priceRm,
    });
  }

  if (Array.isArray(addOns)) {
    for (const addOnId of addOns) {
      const addOn = BOOKING_ADD_ONS.find((item) => item.id === addOnId);
      if (addOn && "priceRm" in addOn) {
        lineItems.push({
          label: addOn.label.replace(/\s*\(RM\d+\)\s*$/, ""),
          amountRm: addOn.priceRm,
        });
      }
    }
  } else if (addOns === "not-sure") {
    lineItems.push({
      label: "Add-ons (to be confirmed)",
      amountRm: 0,
    });
  }

  const totalRm = lineItems.reduce((sum, item) => sum + item.amountRm, 0);
  const depositRm = BOOKING_DEPOSIT_RM;
  const balanceRm = Math.max(totalRm - depositRm, 0);

  return {
    lineItems,
    totalRm,
    depositRm,
    balanceRm,
  };
}
