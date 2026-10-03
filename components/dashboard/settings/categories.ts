import {
  IconBell,
  IconCar,
  IconClock,
  IconCreditCard,
  IconFileInvoice,
  IconPalette,
  IconSparkles,
  IconTag,
  type Icon,
} from "@tabler/icons-react";

import type { SettingsCategory } from "@/utils/dashboardShell";

export const SETTINGS_GROUPS: { title: string; categories: SettingsCategory[] }[] = [
  {
    title: "Business",
    categories: ["pricing-model", "packages", "time-slots", "travel-fee"],
  },
  { title: "Payments", categories: ["payment-method", "invoice"] },
  { title: "App", categories: ["theme", "notifications"] },
];

export const SETTINGS_CATEGORY_META: Record<
  SettingsCategory,
  { label: string; description: string; icon: Icon }
> = {
  "pricing-model": {
    label: "Pricing model",
    description: "Charge clients by package or by style.",
    icon: IconTag,
  },
  packages: {
    label: "Packages & styles",
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
  theme: {
    label: "Theme",
    description: "Choose how Bridalync looks on this device.",
    icon: IconPalette,
  },
  notifications: {
    label: "App & notifications",
    description: "Install the app and get alerts for new and upcoming bookings.",
    icon: IconBell,
  },
};
