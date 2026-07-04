import { z } from "zod";

import { latLngSchema } from "@/schemas/addressSchema";
import { createResponse, withApiHandler } from "@/utils/apiHelper";

const travelDistanceRequestSchema = z.object({
  origin: latLngSchema,
  destination: latLngSchema,
});

const googleRoutesResponseSchema = z.object({
  routes: z
    .array(
      z.object({
        distanceMeters: z.number().nonnegative(),
      })
    )
    .min(1),
});

export const POST = withApiHandler(
  async (_req, { sanitizedBody }) => {
    const { origin, destination } = travelDistanceRequestSchema.parse(
      sanitizedBody
    );

    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY ??
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      return createResponse(
        { error: "Google Maps API key is missing." },
        500
      );
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
              latLng: {
                latitude: origin.lat,
                longitude: origin.lng,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destination.lat,
                longitude: destination.lng,
              },
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
      const errorBody = await googleResponse.text();
      console.error("Google Routes API error:", errorBody);
      return createResponse(
        { error: "Unable to calculate road distance." },
        502
      );
    }

    const parsed = googleRoutesResponseSchema.safeParse(
      await googleResponse.json()
    );

    if (!parsed.success) {
      console.error("Unexpected Google Routes response:", parsed.error.format());
      return createResponse(
        { error: "Unable to calculate road distance." },
        502
      );
    }

    const distanceMeters = parsed.data.routes[0].distanceMeters;

    return createResponse({
      distanceMeters,
      distanceKm: distanceMeters / 1000,
    });
  },
  {
    method: "POST",
    validateSchema: travelDistanceRequestSchema,
  }
);
