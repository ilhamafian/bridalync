import { z } from "zod";

/** LatLng as returned by `google.maps.LatLng` / `Place.location`. */
export const latLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Address component from the Places API (`Place.addressComponents`). */
export const addressComponentSchema = z.object({
  longText: z.string(),
  shortText: z.string(),
  types: z.array(z.string()),
  languageCode: z.string().optional(),
});

/**
 * Address in Google Maps Places API (New) format.
 * Aligns with fields from `Place.fetchFields()`.
 */
export const addressSchema = z.object({
  placeId: z.string().min(1),
  formattedAddress: z.string().min(1),
  displayName: z.string().min(1).optional(),
  location: latLngSchema,
  addressComponents: z.array(addressComponentSchema).optional(),
});

export type LatLng = z.infer<typeof latLngSchema>;
export type AddressComponent = z.infer<typeof addressComponentSchema>;
export type Address = z.infer<typeof addressSchema>;
