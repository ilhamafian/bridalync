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
  { id: "engagement", label: "Engagement" },
  { id: "photoshoot", label: "Photoshoot" },
] as const;

export type EventTypeId = (typeof EVENT_TYPES)[number]["id"];

export const BOOKING_PACKAGES = [
  {
    id: "nikah",
    label: "Nikah (1 session)",
    events: ["nikah"] as const,
    priceRm: 250,
  },
  {
    id: "sanding",
    label: "Sanding (1 session)",
    events: ["sanding"] as const,
    priceRm: 300,
  },
  {
    id: "nikah-sanding",
    label: "Nikah + Sanding (2 sessions)",
    events: ["nikah", "sanding"] as const,
    priceRm: 500,
  },
  {
    id: "corporate",
    label: "Corporate (1 session)",
    events: ["corporate"] as const,
    priceRm: 280,
  },
  {
    id: "engagement",
    label: "Engagement (1 session)",
    events: ["engagement"] as const,
    priceRm: 280,
  },
  {
    id: "photoshoot",
    label: "Photoshoot (1 session)",
    events: ["photoshoot"] as const,
    priceRm: 280,
  },
] as const;

export type BookingPackageId = (typeof BOOKING_PACKAGES)[number]["id"];

export const DEFAULT_STYLE_IMAGE = "/style-sample.jpg";

export const BOOKING_STYLES = [
  { id: "neat-clean", label: "Neat & Clean", imageSrc: DEFAULT_STYLE_IMAGE },
  { id: "drapping", label: "Drapping", imageSrc: DEFAULT_STYLE_IMAGE },
  { id: "baby-turkish", label: "Baby Turkish", imageSrc: DEFAULT_STYLE_IMAGE },
  { id: "turkish", label: "Turkish", imageSrc: DEFAULT_STYLE_IMAGE },
] as const;

export type BookingStyleId = (typeof BOOKING_STYLES)[number]["id"];

export const BOOKING_ADD_ONS = [
  { id: "gandik", label: "Gandik (RM15)", priceRm: 15 },
  { id: "sanggul-lintang", label: "Sanggul Lintang (RM15)", priceRm: 15 },
  { id: "not-sure-yet", label: "Not sure yet" },
] as const;

export type BookingAddOnId = (typeof BOOKING_ADD_ONS)[number]["id"];

export const BOOKING_DEPOSIT_RM = 50;
