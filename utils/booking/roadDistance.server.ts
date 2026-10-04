import { z } from "zod";

import type { Address, LatLng } from "@/schemas/addressSchema";

const googleRoutesResponseSchema = z.object({
  routes: z
    .array(
      z.object({
        distanceMeters: z.number().nonnegative(),
      })
    )
    .min(1),
});

/** Driving distance via the Google Routes API; throws when it can't be calculated. */
export async function fetchRoadDistanceKm(
  origin: LatLng,
  destination: LatLng
): Promise<number> {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Google Maps API key is missing.");
  }

  const googleResponse = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: { latitude: origin.lat, longitude: origin.lng },
          },
        },
        destination: {
          location: {
            latLng: { latitude: destination.lat, longitude: destination.lng },
          },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        languageCode: "en-US",
        units: "METRIC",
      }),
      cache: "no-store",
    }
  );

  if (!googleResponse.ok) {
    console.error("Google Routes API error:", await googleResponse.text());
    throw new Error("Unable to calculate road distance.");
  }

  const parsed = googleRoutesResponseSchema.safeParse(
    await googleResponse.json()
  );

  if (!parsed.success) {
    console.error("Unexpected Google Routes response:", parsed.error.format());
    throw new Error("Unable to calculate road distance.");
  }

  return parsed.data.routes[0].distanceMeters / 1000;
}

/** Road distance from `origin` to each session's venue, one request per unique venue. */
export async function resolveSessionDistancesKm(
  origin: LatLng,
  sessions: Array<{ client_key: string; location?: Address }>
): Promise<Record<string, number>> {
  const byVenue = new Map<string, { destination: LatLng; keys: string[] }>();

  for (const session of sessions) {
    if (!session.location) continue;
    const { lat, lng } = session.location.location;
    const venueKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const venue = byVenue.get(venueKey);
    if (venue) {
      venue.keys.push(session.client_key);
    } else {
      byVenue.set(venueKey, {
        destination: { lat, lng },
        keys: [session.client_key],
      });
    }
  }

  const distances: Record<string, number> = {};
  await Promise.all(
    Array.from(byVenue.values()).map(async ({ destination, keys }) => {
      const distanceKm = await fetchRoadDistanceKm(origin, destination);
      for (const key of keys) distances[key] = distanceKm;
    })
  );

  return distances;
}
