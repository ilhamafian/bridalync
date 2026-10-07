import { z } from "zod";

import type { Address, LatLng } from "@/schemas/addressSchema";
import type { RegionId } from "@/schemas/settingSchema";
import { getRegionFromStateName } from "@/utils/booking/regions";

/** `LocationMapPicker` placeholder id for a pin dropped without a searched place. */
const PINNED_PLACE_ID = "map-pinned";

const geocodeResponseSchema = z.object({
  status: z.string(),
  results: z.array(
    z.object({
      address_components: z.array(
        z.object({
          long_name: z.string(),
          short_name: z.string(),
          types: z.array(z.string()),
        })
      ),
    })
  ),
});

const placeDetailsResponseSchema = z.object({
  addressComponents: z
    .array(
      z.object({
        longText: z.string().optional(),
        shortText: z.string().optional(),
        types: z.array(z.string()),
      })
    )
    .optional(),
});

function getApiKey() {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Maps API key is missing.");
  }
  return apiKey;
}

async function fetchStateNameByLatLng(
  location: LatLng,
  apiKey: string
): Promise<string | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${location.lat},${location.lng}`);
  url.searchParams.set("result_type", "administrative_area_level_1");
  url.searchParams.set("language", "en");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Geocoding failed: ${await response.text()}`);
  }
  const parsed = geocodeResponseSchema.parse(await response.json());
  if (parsed.status === "ZERO_RESULTS") return null;
  if (parsed.status !== "OK") {
    throw new Error(`Geocoding failed: ${parsed.status}`);
  }

  for (const result of parsed.results) {
    const state = result.address_components.find((component) =>
      component.types.includes("administrative_area_level_1")
    );
    if (state) return state.long_name;
  }
  return null;
}

async function fetchStateNameByPlaceId(
  placeId: string,
  apiKey: string
): Promise<string | null> {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "addressComponents",
      },
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(`Place Details failed: ${await response.text()}`);
  }
  const parsed = placeDetailsResponseSchema.parse(await response.json());
  const state = parsed.addressComponents?.find((component) =>
    component.types.includes("administrative_area_level_1")
  );
  return state?.longText ?? state?.shortText ?? null;
}

/** Region of a venue, from its pin (reverse geocoding), falling back to its Google place. */
export async function fetchVenueRegion(
  address: Pick<Address, "placeId" | "location">
): Promise<RegionId | null> {
  const apiKey = getApiKey();

  let stateName: string | null = null;
  try {
    stateName = await fetchStateNameByLatLng(address.location, apiKey);
  } catch (error) {
    if (address.placeId === PINNED_PLACE_ID) throw error;
    console.error("Reverse geocoding failed, using place details:", error);
    stateName = await fetchStateNameByPlaceId(address.placeId, apiKey);
  }

  return stateName ? getRegionFromStateName(stateName) : null;
}

/** Region per session venue (`null` = outside every region), one lookup per unique venue. */
export async function resolveSessionRegions(
  sessions: Array<{ client_key: string; location?: Address }>
): Promise<Record<string, RegionId | null>> {
  const byVenue = new Map<string, { address: Address; keys: string[] }>();

  for (const session of sessions) {
    if (!session.location) continue;
    const { lat, lng } = session.location.location;
    const venueKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const venue = byVenue.get(venueKey);
    if (venue) {
      venue.keys.push(session.client_key);
    } else {
      byVenue.set(venueKey, { address: session.location, keys: [session.client_key] });
    }
  }

  const regions: Record<string, RegionId | null> = {};
  await Promise.all(
    Array.from(byVenue.values()).map(async ({ address, keys }) => {
      const regionId = await fetchVenueRegion(address);
      for (const key of keys) regions[key] = regionId;
    })
  );

  return regions;
}
