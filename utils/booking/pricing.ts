

export type QuotationLineItem = {
  label: string;
  amountRm: number;
};

export type BookingQuotationSummary = {
  lineItems: QuotationLineItem[];
  totalRm: number;
  depositRm: number;
  balanceRm: number;
};

export function formatRm(amount: number) {
  return `RM${amount.toLocaleString("en-MY")}`;
}

export function calculateBookingQuotation(
  packageId: string,
  addOns: string[]
): BookingQuotationSummary {
  const pkg = { id: packageId, label: "Package 1", priceRm: 100 };
  const lineItems: QuotationLineItem[] = [];

  if (pkg) {
    lineItems.push({
      label: pkg.label,
      amountRm: pkg.priceRm,
    });
  }

  if (Array.isArray(addOns)) {
    for (const addOnId of addOns) {
      const addOn = { id: addOnId, label: "Add-on 1", priceRm: 10 };
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
  const depositRm = 50;
  const balanceRm = Math.max(totalRm - depositRm, 0);

  return {
    lineItems,
    totalRm,
    depositRm,
    balanceRm,
  };
}
