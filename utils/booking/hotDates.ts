import type { HotDatePriceType, PublicHotDate } from "@/schemas/hotDateSchema";
import { toDateKey } from "@/utils/booking/availability";
import { nextDateKey } from "@/utils/booking/blockedDates";

export type HotDateLookup = {
  date: string;
  package_id?: string;
  style_id?: string;
  variant_order?: number;
  price: number;
  price_type?: HotDatePriceType;
};

/** A hot date override: an RM amount (`fixed`) or a % increase (`percent`). */
export type HotDateRate = {
  price: number;
  type: HotDatePriceType;
};

export function toHotDateLookup(
  item: Pick<
    PublicHotDate,
    "date" | "package_id" | "style_id" | "variant_order" | "price" | "price_type"
  >
): HotDateLookup {
  return {
    date: item.date,
    package_id: item.package_id,
    style_id: item.style_id,
    variant_order: item.variant_order,
    price: item.price,
    price_type: item.price_type ?? "fixed",
  };
}

/** Plain, serializable hot date (drops `_id`, `user_id`, timestamps). */
export function toHotDateItem(item: HotDateLookup): PublicHotDate {
  return {
    date: item.date,
    ...(item.package_id ? { package_id: item.package_id } : {}),
    ...(item.style_id ? { style_id: item.style_id } : {}),
    ...(item.variant_order !== undefined
      ? { variant_order: item.variant_order }
      : {}),
    price: item.price,
    price_type: item.price_type ?? "fixed",
  };
}

function toHotDateRate(item: HotDateLookup): HotDateRate {
  return { price: item.price, type: item.price_type ?? "fixed" };
}

export function packageHotDateKey(date: string, packageId: string) {
  return `package:${date}:${packageId}`;
}

export function styleHotDateKey(
  date: string,
  styleId: string,
  variantOrder: number
) {
  return `style:${date}:${styleId}:${variantOrder}`;
}

export function buildHotDatePriceMap(
  hotDates: HotDateLookup[]
): Map<string, HotDateRate> {
  const map = new Map<string, HotDateRate>();

  for (const item of hotDates) {
    if (item.package_id) {
      map.set(packageHotDateKey(item.date, item.package_id), toHotDateRate(item));
      continue;
    }
    if (item.style_id !== undefined && item.variant_order !== undefined) {
      map.set(
        styleHotDateKey(item.date, item.style_id, item.variant_order),
        toHotDateRate(item)
      );
    }
  }

  return map;
}

export function getPackageHotDatePrice(
  priceMap: Map<string, HotDateRate>,
  date: Date | string,
  packageId: string
): HotDateRate | undefined {
  const dateKey = toDateKey(date);
  if (!dateKey) return undefined;
  return priceMap.get(packageHotDateKey(dateKey, packageId));
}

/**
 * Hot date rates set for the event on its session dates. Resolve them with `resolveEffectivePrice` /
 * `getRegionEventPrice`, which charge the highest one.
 */
export function getEventHotDatePrice(
  priceMap: Map<string, HotDateRate>,
  dates: Array<Date | string>,
  packageId: string
): HotDateRate[] {
  return dates
    .map((date) => getPackageHotDatePrice(priceMap, date, packageId))
    .filter((rate): rate is HotDateRate => rate !== undefined);
}

export function getStyleHotDatePrice(
  priceMap: Map<string, HotDateRate>,
  date: Date | string,
  styleId: string,
  variantOrder: number
): HotDateRate | undefined {
  const dateKey = toDateKey(date);
  if (!dateKey) return undefined;
  return priceMap.get(styleHotDateKey(dateKey, styleId, variantOrder));
}

export type HotDateTarget =
  | { package_id: string }
  | { style_id: string; variant_order: number };

/** A package (package pricing) or style variant (style pricing) that can get a hot date price. */
export type HotDateCatalogRow = {
  key: string;
  label: string;
  catalogPrice: number;
  target: HotDateTarget;
};

export function hotDateTargetKey(
  item: Pick<HotDateLookup, "package_id" | "style_id" | "variant_order">
): string | null {
  if (item.package_id) return `package:${item.package_id}`;
  if (item.style_id && item.variant_order !== undefined) {
    return `style:${item.style_id}:${item.variant_order}`;
  }
  return null;
}

export function buildHotDateCatalog(
  chargeBy: "package" | "style",
  packages: { _id: string; name: string; price: number }[],
  styles: {
    _id: string;
    name: string;
    variants: { name: string; order: number; price: number }[];
  }[]
): HotDateCatalogRow[] {
  if (chargeBy === "package") {
    return packages.map((pkg) => ({
      key: `package:${pkg._id}`,
      label: pkg.name,
      catalogPrice: pkg.price,
      target: { package_id: pkg._id },
    }));
  }

  return styles.flatMap((style) =>
    [...style.variants]
      .sort((a, b) => a.order - b.order)
      .map((variant) => ({
        key: `style:${style._id}:${variant.order}`,
        label: `${style.name} — ${variant.name}`,
        catalogPrice: variant.price,
        target: { style_id: style._id, variant_order: variant.order },
      }))
  );
}

/** `date|targetKey` -> rate, for looking up a row's override on a date. */
export function buildHotDateRowPriceMap(hotDates: HotDateLookup[]) {
  const map = new Map<string, HotDateRate>();
  for (const item of hotDates) {
    const targetKey = hotDateTargetKey(item);
    if (targetKey) map.set(`${item.date}|${targetKey}`, toHotDateRate(item));
  }
  return map;
}

export type HotDateRange = {
  /** YYYY-MM-DD, inclusive */
  start: string;
  end: string;
  dates: string[];
  prices: { row: HotDateCatalogRow; rate: HotDateRate }[];
};

/**
 * Groups hot dates into runs of consecutive days with identical prices, sorted by start date.
 * Overrides for items no longer in the catalog are ignored.
 */
export function groupHotDateRanges(
  hotDates: HotDateLookup[],
  catalog: HotDateCatalogRow[]
): HotDateRange[] {
  const priceMap = buildHotDateRowPriceMap(hotDates);
  const dates = [...new Set(hotDates.map((item) => item.date))].sort();
  const ranges: HotDateRange[] = [];
  let lastSignature = "";

  for (const date of dates) {
    const prices = catalog.flatMap((row) => {
      const rate = priceMap.get(`${date}|${row.key}`);
      return rate === undefined ? [] : [{ row, rate }];
    });
    if (prices.length === 0) continue;

    const signature = prices
      .map(({ row, rate }) => `${row.key}=${rate.type}:${rate.price}`)
      .join(",");
    const last = ranges.at(-1);
    if (last && lastSignature === signature && nextDateKey(last.end) === date) {
      last.end = date;
      last.dates.push(date);
    } else {
      ranges.push({ start: date, end: date, dates: [date], prices });
    }
    lastSignature = signature;
  }

  return ranges;
}

/** RM a percentage increase adds to `basePrice` (rounded to whole RM). */
function percentIncreaseRm(basePrice: number, percent: number): number {
  return Math.round((basePrice * percent) / 100);
}

/** Hot date price for an item usually charged `catalogPrice`: fixed = that RM price, percent = increased by it. */
export function resolveHotDatePrice(catalogPrice: number, rate: HotDateRate): number {
  return rate.type === "percent"
    ? catalogPrice + percentIncreaseRm(catalogPrice, rate.price)
    : rate.price;
}

/** Hot date amount added on top of `basePrice` (per-event state pricing): fixed = that RM, percent = share of it. */
export function resolveHotDateExtra(basePrice: number, rate: HotDateRate): number {
  return rate.type === "percent"
    ? percentIncreaseRm(basePrice, rate.price)
    : rate.price;
}

/** Price charged for an item; several rates (an event over several dates) charge the highest. */
export function resolveEffectivePrice(
  catalogPrice: number,
  rate: HotDateRate | HotDateRate[] | undefined
): number {
  const rates = rate === undefined ? [] : Array.isArray(rate) ? rate : [rate];
  if (rates.length === 0) return catalogPrice;
  return Math.max(...rates.map((item) => resolveHotDatePrice(catalogPrice, item)));
}
