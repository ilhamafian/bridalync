import { roundRm } from "@/utils/booking/pricing";

/** Whole-ringgit amount for tight spaces, e.g. `RM1,250`. */
export function formatRmShort(amount: number) {
  return `RM${roundRm(amount).toLocaleString("en-MY")}`;
}

export function formatPaymentTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
