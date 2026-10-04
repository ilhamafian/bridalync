import { z } from "zod";

import { latLngSchema } from "@/schemas/addressSchema";
import { createResponse, withApiHandler } from "@/utils/apiHelper";
import { fetchRoadDistanceKm } from "@/utils/booking/roadDistance.server";

const travelDistanceRequestSchema = z.object({
  origin: latLngSchema,
  destination: latLngSchema,
});

export const POST = withApiHandler(
  async (_req, { sanitizedBody }) => {
    const { origin, destination } = travelDistanceRequestSchema.parse(
      sanitizedBody
    );

    try {
      const distanceKm = await fetchRoadDistanceKm(origin, destination);
      return createResponse({
        distanceMeters: Math.round(distanceKm * 1000),
        distanceKm,
      });
    } catch (error) {
      return createResponse(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unable to calculate road distance.",
        },
        502
      );
    }
  },
  {
    method: "POST",
    validateSchema: travelDistanceRequestSchema,
  }
);
