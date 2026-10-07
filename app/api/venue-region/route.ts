import { z } from "zod";

import { latLngSchema } from "@/schemas/addressSchema";
import { createResponse, withApiHandler } from "@/utils/apiHelper";
import { fetchVenueRegion } from "@/utils/booking/region.server";

const venueRegionRequestSchema = z.object({
  placeId: z.string().min(1),
  location: latLngSchema,
});

export const POST = withApiHandler(
  async (_req, { sanitizedBody }) => {
    const venue = venueRegionRequestSchema.parse(sanitizedBody);

    try {
      const regionId = await fetchVenueRegion(venue);
      return createResponse({ regionId });
    } catch (error) {
      console.error("Venue region lookup failed:", error);
      return createResponse(
        { error: "Unable to check the venue's state." },
        502
      );
    }
  },
  {
    method: "POST",
    validateSchema: venueRegionRequestSchema,
  }
);
