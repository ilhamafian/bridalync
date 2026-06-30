import { z } from "zod";

export const addressSchema = z.object({
  // Google Maps identifiers
  placeId: z.string().min(1),
  formattedAddress: z.string().min(1),
  // Parsed components (not all are returned for every place)
  line1: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  postalCode: z.string().min(1).optional(),
  country: z.string().min(1),
  // Coordinates
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type Address = z.infer<typeof addressSchema>;
