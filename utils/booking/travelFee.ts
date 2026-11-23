export const TRAVEL_FEE_LABEL = "Travel fee";

/** Whether clients see the distance travel fee as its own line. Missing = hidden. */
export function showsTravelFee(
  travel: { show_fee?: boolean } | null | undefined
): boolean {
  return travel?.show_fee === true;
}
