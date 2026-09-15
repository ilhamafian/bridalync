import type { PublicHotDate } from "@/schemas/hotDateSchema";
import { toDateKey } from "@/utils/booking/availability";

export type HotDateLookup = {
  date: string;
  package_id?: string;
  style_id?: string;
  variant_order?: number;
  price: number;
};

export function toHotDateLookup(
  item: Pick<
    PublicHotDate,
    "date" | "package_id" | "style_id" | "variant_order" | "price"
  >
): HotDateLookup {
  return {
    date: item.date,
    package_id: item.package_id,
    style_id: item.style_id,
    variant_order: item.variant_order,
    price: item.price,
  };
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
): Map<string, number> {
  const map = new Map<string, number>();

  for (const item of hotDates) {
    if (item.package_id) {
      map.set(packageHotDateKey(item.date, item.package_id), item.price);
      continue;
    }
    if (item.style_id !== undefined && item.variant_order !== undefined) {
      map.set(
        styleHotDateKey(item.date, item.style_id, item.variant_order),
        item.price
      );
    }
  }

  return map;
}

export function getPackageHotDatePrice(
  priceMap: Map<string, number>,
  date: Date | string,
  packageId: string
): number | undefined {
  const dateKey = toDateKey(date);
  if (!dateKey) return undefined;
  return priceMap.get(packageHotDateKey(dateKey, packageId));
}

export function getStyleHotDatePrice(
  priceMap: Map<string, number>,
  date: Date | string,
  styleId: string,
  variantOrder: number
): number | undefined {
  const dateKey = toDateKey(date);
  if (!dateKey) return undefined;
  return priceMap.get(styleHotDateKey(dateKey, styleId, variantOrder));
}

export function resolveEffectivePrice(
  catalogPrice: number,
  overridePrice: number | undefined
): number {
  return overridePrice ?? catalogPrice;
}
