type VariantWithExtra = { event_extra_price?: number | null };

/** What picking this variant adds on top of the event price when charging by event (whole RM). */
export function getStyleExtraRm(variant: VariantWithExtra | null | undefined): number {
  const extra = variant?.event_extra_price;
  return typeof extra === "number" && Number.isFinite(extra) && extra > 0
    ? Math.round(extra)
    : 0;
}

/** Quotation row for a picked style's extra charge, e.g. "Nikah — Shawl — Bunga Raya". */
export function styleExtraLabel(sessionName: string, styleName: string): string {
  return `${sessionName} — ${styleName}`;
}

/** Whether any variant carries an extra charge (clients then get the optional style step). */
export function hasStyleExtras(
  styles: ReadonlyArray<{ variants: ReadonlyArray<VariantWithExtra> }>
): boolean {
  return styles.some((style) =>
    style.variants.some((variant) => getStyleExtraRm(variant) > 0)
  );
}
