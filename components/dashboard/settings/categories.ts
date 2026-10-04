import {
  IconBell,
  IconBrandGoogle,
  IconCar,
  IconClock,
  IconCreditCard,
  IconFileInvoice,
  IconLock,
  IconPalette,
  IconSparkles,
  IconTag,
  type Icon,
} from "@tabler/icons-react";

import type { SettingsCategory } from "@/utils/dashboardShell";

export const SETTINGS_GROUPS: { title: string; categories: SettingsCategory[] }[] = [
  {
    title: "Business",
    categories: ["pricing-model", "events", "time-slots", "travel-fee"],
  },
  { title: "Payments", categories: ["payment-method", "invoice"] },
  { title: "App", categories: ["google-calendar", "theme", "notifications"] },
  { title: "Account", categories: ["password"] },
];

export const SETTINGS_CATEGORY_META: Record<
  SettingsCategory,
  { label: string; description: string; icon: Icon }
> = {
  "pricing-model": {
    label: "Pricing model",
    description: "Charge clients by event or by style.",
    icon: IconTag,
  },
  events: {
    label: "Events & styles",
    description: "Manage what clients can book from your profile.",
    icon: IconSparkles,
  },
  "time-slots": {
    label: "Time slots",
    description: "Session windows clients can book.",
    icon: IconClock,
  },
  "travel-fee": {
    label: "Travel fee",
    description: "Charge for travel from your base location.",
    icon: IconCar,
  },
  "payment-method": {
    label: "Payment method",
    description: "How clients pay you, and when full payment is due.",
    icon: IconCreditCard,
  },
  invoice: {
    label: "Invoice",
    description: "Company details and terms shown on your invoices.",
    icon: IconFileInvoice,
  },
  "google-calendar": {
    label: "Google Calendar",
    description:
      "Sync confirmed bookings to Google Calendar and import events as bookings.",
    icon: IconBrandGoogle,
  },
  theme: {
    label: "Theme",
    description: "Pick a color and light or dark mode for your dashboard and booking page.",
    icon: IconPalette,
  },
  notifications: {
    label: "App & notifications",
    description: "Install the app and get alerts for new and upcoming bookings.",
    icon: IconBell,
  },
  password: {
    label: "Reset password",
    description: "Get a code by email and set a new password.",
    icon: IconLock,
  },
};
