export const TIME_SLOTS = [
  { id: "6-8", label: "6am - 8am" },
  { id: "10-12", label: "10am - 12pm" },
  { id: "14-16", label: "2pm - 4pm" },
  { id: "18-20", label: "6pm - 8pm" },
] as const;

export type TimeSlotId = (typeof TIME_SLOTS)[number]["id"];

export const EVENT_TYPES = [
  { id: "nikah", label: "Nikah" },
  { id: "sanding", label: "Sanding" },
  { id: "corporate", label: "Corporate" },
] as const;

export type EventTypeId = (typeof EVENT_TYPES)[number]["id"];

export const BOOKING_PACKAGES = [
  {
    id: "nikah",
    label: "Nikah (1 session)",
    events: ["nikah"] as const,
  },
  {
    id: "sanding",
    label: "Sanding (1 session)",
    events: ["sanding"] as const,
  },
  {
    id: "nikah-sanding",
    label: "Nikah + Sanding (2 sessions)",
    events: ["nikah", "sanding"] as const,
  },
  {
    id: "corporate",
    label: "Corporate (1 session)",
    events: ["corporate"] as const,
  },
] as const;

export type BookingPackageId = (typeof BOOKING_PACKAGES)[number]["id"];

export const LOCATION_OPTIONS = [
  { id: "bride-home", label: "Bride's home" },
  { id: "hotel-venue", label: "Hotel / venue" },
  { id: "mosque", label: "Mosque" },
  { id: "other", label: "Other" },
] as const;

export type LocationId = (typeof LOCATION_OPTIONS)[number]["id"];
