"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconCalendarQuestion,
  IconCheck,
  IconCreditCard,
  IconMail,
} from "@tabler/icons-react";

import {
  IconBadge,
  RowText,
  SettingsFeedback,
  SettingsSection,
  settingsListClassName,
  settingsRowClassName,
} from "@/components/dashboard/settings/SettingsUi";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: IconCalendarQuestion,
    title: "Client sends a request",
    description:
      "They pick everything as usual, but don't pay yet. Other clients can still request the same slot.",
  },
  {
    icon: IconCheck,
    title: "You pick who to work with",
    description:
      "Approve one request and the slot is yours with them; other requests for that slot are declined automatically.",
  },
  {
    icon: IconMail,
    title: "Clients get an email",
    description: "The approved client gets a link to pay; declined clients are told you can't take the booking.",
  },
  {
    icon: IconCreditCard,
    title: "Client pays to confirm",
    description: "The booking is confirmed once the payment goes through.",
  },
];

export function BookingRequestSettings({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: boolean) {
    setEnabled(next);
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_requests: next }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setEnabled(!next);
        setError(typeof data.error === "string" ? data.error : "Failed to save.");
        return;
      }
      router.refresh();
    } catch {
      setEnabled(!next);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection title="Approval">
        <div className={settingsListClassName}>
          <label className={cn(settingsRowClassName, "cursor-pointer")}>
            <IconBadge icon={IconCalendarQuestion} />
            <RowText
              title="Approve bookings first"
              description={
                enabled
                  ? "Clients send a request; they pay after you approve it."
                  : "Clients pay straight away to confirm their booking."
              }
            />
            <Switch
              checked={enabled}
              disabled={saving}
              onCheckedChange={(next) => void handleChange(next)}
            />
          </label>
        </div>
        <SettingsFeedback error={error} />
      </SettingsSection>

      <SettingsSection title="How it works">
        <div className={settingsListClassName}>
          {STEPS.map((step) => (
            <div key={step.title} className={settingsRowClassName}>
              <IconBadge icon={step.icon} />
              <RowText title={step.title} description={step.description} />
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  );
}
