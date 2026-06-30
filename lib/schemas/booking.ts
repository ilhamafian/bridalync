import { z } from "zod";

import { BOOKING_PACKAGES, EVENT_TYPES } from "@/lib/booking/constants";

const eventTypeIds = EVENT_TYPES.map((event) => event.id) as [
  (typeof EVENT_TYPES)[number]["id"],
  ...(typeof EVENT_TYPES)[number]["id"][],
];

const packageIds = BOOKING_PACKAGES.map((pkg) => pkg.id) as [
  (typeof BOOKING_PACKAGES)[number]["id"],
  ...(typeof BOOKING_PACKAGES)[number]["id"][],
];

export const eventTypeIdSchema = z.enum(eventTypeIds);

export const bookingPackageIdSchema = z.enum(packageIds);

export const sessionLocationSchema = z.object({
  label: z.string().min(1),
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  placeId: z.string().optional(),
});

export type SessionLocation = z.infer<typeof sessionLocationSchema>;

export const bookingSessionSchema = z.object({
  id: z.string().min(1),
  eventType: eventTypeIdSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotId: z.enum(["6-8", "10-12", "14-16", "18-20"]),
  location: sessionLocationSchema.nullable(),
});

export type BookingSession = z.infer<typeof bookingSessionSchema>;

export const bookingStyleIdSchema = z.enum([
  "neat-clean",
  "drapping",
  "baby-turkish",
  "turkish",
]);

export type BookingStyleId = z.infer<typeof bookingStyleIdSchema>;

export const bookingAddOnIdSchema = z.enum([
  "gandik",
  "sanggul-lintang",
  "not-sure-yet",
]);

export type BookingAddOnId = z.infer<typeof bookingAddOnIdSchema>;

export const addOnsSelectionSchema = z.union([
  z.literal("skipped"),
  z.literal("not-sure"),
  z.array(z.enum(["gandik", "sanggul-lintang"])).min(1),
]);

export type AddOnsSelection = z.infer<typeof addOnsSelectionSchema>;

export const bookingContactSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  email: z.string().trim().email(),
});

export type BookingContact = z.infer<typeof bookingContactSchema>;

export const bookingDraftSchema = z.object({
  freelancerUsername: z.string().min(1),
  packageId: bookingPackageIdSchema,
  sessions: z.array(bookingSessionSchema).min(1),
  style: bookingStyleIdSchema,
  addOns: addOnsSelectionSchema,
  contact: bookingContactSchema,
});

export type BookingDraft = z.infer<typeof bookingDraftSchema>;

export const bookingInvoiceSchema = z.object({
  lineItems: z.array(
    z.object({
      label: z.string(),
      amountRm: z.number(),
    })
  ),
  totalRm: z.number(),
  depositRm: z.number(),
  balanceRm: z.number(),
});
