import type { Address } from "@/schemas/addressSchema";
import {
  MALAYSIA_REGION_IDS,
  type RegionId,
  type RegionPrices,
  type TravelSetting,
} from "@/schemas/settingSchema";

export const MALAYSIA_REGIONS: Array<{ id: RegionId; label: string }> = [
  { id: "klang_valley", label: "Klang Valley" },
  { id: "negeri_sembilan", label: "Negeri Sembilan" },
  { id: "melaka", label: "Melaka" },
  { id: "johor", label: "Johor" },
  { id: "perak", label: "Perak" },
  { id: "pahang", label: "Pahang" },
  { id: "kedah", label: "Kedah" },
  { id: "penang", label: "Penang" },
  { id: "perlis", label: "Perlis" },
  { id: "kelantan", label: "Kelantan" },
  { id: "terengganu", label: "Terengganu" },
  { id: "sabah", label: "Sabah" },
  { id: "sarawak", label: "Sarawak" },
  { id: "labuan", label: "Labuan" },
];

export function getRegionLabel(regionId: RegionId): string {
  return (
    MALAYSIA_REGIONS.find((region) => region.id === regionId)?.label ?? regionId
  );
}

const STATE_NAME_TO_REGION: Array<[string, RegionId]> = [
  ["kuala lumpur", "klang_valley"],
  ["putrajaya", "klang_valley"],
  ["selangor", "klang_valley"],
  ["negeri sembilan", "negeri_sembilan"],
  ["melaka", "melaka"],
  ["malacca", "melaka"],
  ["johor", "johor"],
  ["perak", "perak"],
  ["pahang", "pahang"],
  ["kedah", "kedah"],
  ["penang", "penang"],
  ["pinang", "penang"],
  ["perlis", "perlis"],
  ["kelantan", "kelantan"],
  ["terengganu", "terengganu"],
  ["sabah", "sabah"],
  ["sarawak", "sarawak"],
  ["labuan", "labuan"],
];

/** Maps a Google state name ("Wilayah Persekutuan Kuala Lumpur", "Pulau Pinang", ...) to a region. */
export function getRegionFromStateName(stateName: string): RegionId | null {
  const normalized = stateName.toLowerCase();
  for (const [name, regionId] of STATE_NAME_TO_REGION) {
    if (normalized.includes(name)) return regionId;
  }
  return null;
}

export function getRegionFromAddress(address: Address): RegionId | null {
  const state = address.addressComponents?.find((component) =>
    component.types.includes("administrative_area_level_1")
  );
  if (state) {
    return (
      getRegionFromStateName(state.longText) ??
      getRegionFromStateName(state.shortText)
    );
  }
  return null;
}

export function isRegionId(value: string): value is RegionId {
  return (MALAYSIA_REGION_IDS as readonly string[]).includes(value);
}

/** States the stylist doesn't serve; the base state is always served. */
export function getUnservedRegions(
  travel:
    | Pick<TravelSetting, "unserved_regions" | "base_region">
    | null
    | undefined
): RegionId[] {
  return (travel?.unserved_regions ?? []).filter(
    (id) => id !== travel?.base_region
  );
}

/** First venue region the stylist doesn't serve; unknown regions pass. */
export function findUnservedRegion(
  regions: Array<RegionId | null>,
  unserved: RegionId[]
): RegionId | null {
  return (
    regions.find(
      (regionId): regionId is RegionId =>
        regionId !== null && unserved.includes(regionId)
    ) ?? null
  );
}

export type RegionPriceResult =
  | { ok: true; regionId: RegionId; priceRm: number }
  /** `regionId` null = the venue is outside every region. */
  | { ok: false; regionId: RegionId | null; error: string };

/** Highest price across the booking's regions; fails on an unknown or unpriced region. */
export function getBookingRegionPrice(
  regions: Array<RegionId | null>,
  prices: RegionPrices | undefined
): RegionPriceResult | null {
  if (regions.length === 0) return null;

  let best: { regionId: RegionId; priceRm: number } | null = null;
  for (const regionId of regions) {
    if (!regionId) {
      return {
        ok: false,
        regionId: null,
        error: "This venue is outside the areas we serve.",
      };
    }
    const priceRm = prices?.[regionId];
    if (priceRm == null) {
      return {
        ok: false,
        regionId,
        error: `We don't serve ${getRegionLabel(regionId)} yet.`,
      };
    }
    if (!best || priceRm > best.priceRm) {
      best = { regionId, priceRm };
    }
  }

  return best ? { ok: true, ...best } : null;
}

export type TravelPricing =
  | { kind: "none" }
  | { kind: "distance" }
  | { kind: "region_fixed"; prices: RegionPrices }
  | { kind: "region_per_event" };

/** How travel affects pricing; per-event region pricing only applies when charging by event. */
export function getTravelPricing(
  travel: Pick<
    TravelSetting,
    "enabled" | "mode" | "region_mode" | "region_prices"
  > | null | undefined,
  chargeBy: "package" | "style"
): TravelPricing {
  if (!travel?.enabled) return { kind: "none" };
  if (travel.mode !== "region") return { kind: "distance" };
  if (travel.region_mode === "per_event" && chargeBy === "package") {
    return { kind: "region_per_event" };
  }
  return { kind: "region_fixed", prices: travel.region_prices ?? {} };
}

/** Per-event region price; a hot date's amount is an extra charge on top of it. */
export function getRegionEventPrice(
  regionPriceRm: number,
  hotDateChargeRm: number | undefined
): number {
  return regionPriceRm + (hotDateChargeRm ?? 0);
}

/** Form state for a region price list: RM text per region, blank = not served. */
export type RegionPriceInputs = Partial<Record<RegionId, string>>;

export function toRegionPriceInputs(
  prices: RegionPrices | undefined
): RegionPriceInputs {
  const inputs: RegionPriceInputs = {};
  for (const { id } of MALAYSIA_REGIONS) {
    const price = prices?.[id];
    if (price != null) inputs[id] = String(price);
  }
  return inputs;
}

/** Blank inputs are dropped; returns `null` when any filled-in price is invalid. */
export function parseRegionPriceInputs(
  inputs: RegionPriceInputs
): RegionPrices | null {
  const prices: RegionPrices = {};
  for (const { id } of MALAYSIA_REGIONS) {
    const raw = inputs[id]?.trim() ?? "";
    if (raw === "") continue;
    const price = Number(raw);
    if (!Number.isFinite(price) || price < 0) return null;
    prices[id] = price;
  }
  return prices;
}

export function omitRegions(
  prices: RegionPrices | undefined,
  regionIds: RegionId[]
): RegionPrices {
  const kept: RegionPrices = {};
  for (const [id, price] of Object.entries(prices ?? {})) {
    if (!regionIds.includes(id as RegionId)) kept[id as RegionId] = price;
  }
  return kept;
}

/** Lowest and highest region price, for summaries. */
export function getRegionPriceRange(
  prices: RegionPrices | undefined
): { min: number; max: number } | null {
  const values = Object.values(prices ?? {}).filter(
    (value): value is number => typeof value === "number"
  );
  if (values.length === 0) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
}
