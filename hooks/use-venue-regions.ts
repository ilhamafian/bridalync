"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Address } from "@/schemas/addressSchema";
import type { RegionId, RegionPrices } from "@/schemas/settingSchema";
import {
  findUnservedRegion,
  getBookingRegionPrice,
  type RegionPriceResult,
} from "@/utils/booking/regions";

export type VenueRegion =
  | { status: "loading" }
  | { status: "ready"; regionId: RegionId | null }
  | { status: "error" };

export type RegionQuote =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; result: RegionPriceResult | null };

function venueKey(location: Address["location"]) {
  return `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
}

/** Looks up each venue's region through `/api/venue-region` (same lookup as saving a booking). */
export function useVenueRegions(
  locations: Array<Address | null | undefined>,
  enabled: boolean
) {
  const [regions, setRegions] = useState<Record<string, VenueRegion>>({});
  const requestedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return;

    for (const location of locations) {
      if (!location) continue;
      const key = venueKey(location.location);
      if (requestedRef.current.has(key)) continue;
      requestedRef.current.add(key);

      void fetch("/api/venue-region", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: location.placeId,
          location: location.location,
        }),
      })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !("regionId" in data)) {
            throw new Error("Venue region request failed.");
          }
          setRegions((current) => ({
            ...current,
            [key]: {
              status: "ready",
              regionId: (data.regionId as RegionId | null) ?? null,
            },
          }));
        })
        .catch(() => {
          requestedRef.current.delete(key);
          setRegions((current) => ({ ...current, [key]: { status: "error" } }));
        });
    }
  }, [enabled, locations]);

  return regions;
}

export type OutOfStateCheck =
  | { status: "loading" }
  | { status: "ready"; outOfState: boolean };

/**
 * Whether any venue is outside `baseRegion`. Venues outside every region, or whose
 * lookup failed, count as out of state.
 */
export function useOutOfStateVenues(
  locations: Array<Address | null | undefined>,
  baseRegion: RegionId | undefined,
  enabled: boolean
): OutOfStateCheck {
  const venueRegions = useVenueRegions(locations, enabled && !!baseRegion);

  return useMemo(() => {
    if (!enabled || !baseRegion) return { status: "ready", outOfState: false };

    let loading = false;
    for (const location of locations) {
      if (!location) continue;
      const region = venueRegions[venueKey(location.location)];
      if (region?.status === "error") return { status: "ready", outOfState: true };
      if (region?.status !== "ready") {
        loading = true;
        continue;
      }
      if (region.regionId !== baseRegion) {
        return { status: "ready", outOfState: true };
      }
    }

    return loading ? { status: "loading" } : { status: "ready", outOfState: false };
  }, [baseRegion, enabled, locations, venueRegions]);
}

export type UnservedVenueCheck =
  | { status: "loading" }
  | { status: "ready"; unservedRegion: RegionId | null };

/** First venue state in `unserved`; venues outside every region, or whose lookup failed, pass (the server re-checks). */
export function useUnservedVenues(
  locations: Array<Address | null | undefined>,
  unserved: RegionId[]
): UnservedVenueCheck {
  const enabled = unserved.length > 0;
  const venueRegions = useVenueRegions(locations, enabled);

  return useMemo(() => {
    if (!enabled) return { status: "ready", unservedRegion: null };

    const regionIds: Array<RegionId | null> = [];
    for (const location of locations) {
      if (!location) continue;
      const region = venueRegions[venueKey(location.location)];
      if (region?.status === "ready") regionIds.push(region.regionId);
      else if (region?.status !== "error") return { status: "loading" };
    }

    return {
      status: "ready",
      unservedRegion: findUnservedRegion(regionIds, unserved),
    };
  }, [enabled, locations, unserved, venueRegions]);
}

/** Highest region price for the given venues, once every venue's region is known. */
export function useRegionQuote(
  locations: Array<Address | null | undefined>,
  prices: RegionPrices | undefined,
  enabled: boolean
): RegionQuote {
  const venueRegions = useVenueRegions(locations, enabled);

  return useMemo(() => {
    if (!enabled) return { status: "ready", result: null };

    const regionIds: Array<RegionId | null> = [];
    let status: "ready" | "loading" | "error" = "ready";
    for (const location of locations) {
      if (!location) continue;
      const region = venueRegions[venueKey(location.location)];
      if (region?.status === "ready") {
        regionIds.push(region.regionId);
      } else if (region?.status === "error") {
        status = "error";
      } else if (status !== "error") {
        status = "loading";
      }
    }

    if (status !== "ready") return { status };
    return {
      status: "ready",
      result: getBookingRegionPrice(regionIds, prices),
    };
  }, [enabled, locations, prices, venueRegions]);
}
