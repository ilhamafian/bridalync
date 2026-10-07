"use client";

import { useState } from "react";
import { IconPlus, IconTrash } from "@tabler/icons-react";

import { DepositField, parseDepositInput } from "@/components/catalog/DepositField";
import { BackButton } from "@/components/dashboard/BackButton";
import { EmptyCard } from "@/components/dashboard/DashboardHome";
import {
  SettingsFeedback,
  SettingsSection,
  settingsCardClassName,
} from "@/components/dashboard/settings/SettingsUi";
import type { PackageItem } from "@/components/PackagesManager";
import { RegionPriceList } from "@/components/RegionPriceList";
import { SortableList } from "@/components/SortableList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DepositType, PackageDayMode } from "@/schemas/packageSchema";
import { getEventDayMode, getEventSessions } from "@/utils/booking/events";
import {
  parseRegionPriceInputs,
  toRegionPriceInputs,
  type RegionPriceInputs,
} from "@/utils/booking/regions";
import { EVENTS_SETTINGS_HREF } from "@/utils/dashboardShell";

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-white/60 px-3 text-sm text-foreground dark:bg-white/5",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

const DAY_MODE_OPTIONS: { value: PackageDayMode; label: string }[] = [
  { value: "same_day", label: "Same day" },
  { value: "different_day", label: "Different days" },
];

type SessionRow = { id: string; name: string };

type EventFormState = {
  name: string;
  description: string;
  price: string;
  deposit: string;
  depositType: DepositType;
  regionPrices: RegionPriceInputs;
  sessions: SessionRow[];
  dayMode: PackageDayMode;
};

function createRowId() {
  return crypto.randomUUID();
}

function toForm(pkg: PackageItem | null): EventFormState {
  if (!pkg) {
    return {
      name: "",
      description: "",
      price: "",
      deposit: "",
      depositType: "fixed",
      regionPrices: {},
      sessions: [{ id: createRowId(), name: "" }],
      dayMode: "same_day",
    };
  }
  return {
    name: pkg.name,
    description: pkg.description ?? "",
    price: pkg.price?.toString() ?? "",
    deposit: pkg.deposit?.toString() ?? "",
    depositType: pkg.deposit_type ?? "fixed",
    regionPrices: toRegionPriceInputs(pkg.region_prices),
    sessions: getEventSessions(pkg).map((session) => ({
      id: createRowId(),
      name: session.name,
    })),
    dayMode: getEventDayMode(pkg),
  };
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Add (`pkg` null) or edit an event on its own page; remount with a new `key` to reset. */
export function EventEditorPage({
  pkg,
  notFound,
  nextOrder,
  chargeBy,
  regionPricesPerEvent,
  onSaved,
}: {
  pkg: PackageItem | null;
  /** Editing an id that doesn't exist. */
  notFound: boolean;
  nextOrder: number;
  chargeBy: "package" | "style";
  regionPricesPerEvent: boolean;
  onSaved: (saved: PackageItem) => void;
}) {
  const [form, setForm] = useState(() => toForm(pkg));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (notFound) {
    return (
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <BackButton fallbackHref={EVENTS_SETTINGS_HREF} />
        <EmptyCard>Event not found.</EmptyCard>
      </div>
    );
  }

  async function handleSave() {
    const name = form.name.trim();
    if (!name) {
      setError("Event name is required.");
      return;
    }

    const sessionNames = form.sessions.map((session) => session.name.trim());
    if (sessionNames.length === 1 && !sessionNames[0]) {
      sessionNames[0] = name;
    }
    if (sessionNames.some((sessionName) => !sessionName)) {
      setError("Name every session.");
      return;
    }

    const regionPrices = parseRegionPriceInputs(form.regionPrices);
    if (!regionPrices) {
      setError("Enter a valid price for each state, or leave it blank.");
      return;
    }
    if (regionPricesPerEvent && Object.keys(regionPrices).length === 0) {
      setError("Enter a price for at least one state.");
      return;
    }

    const deposit = parseDepositInput(form.deposit, form.depositType);
    if (deposit === null) {
      setError(
        form.depositType === "percent"
          ? "Enter a deposit between 0% and 100%."
          : "Enter a valid deposit."
      );
      return;
    }

    const payload = {
      name,
      description: form.description.trim(),
      price: parseOptionalNumber(form.price),
      region_prices: regionPrices,
      deposit,
      deposit_type: form.depositType,
      sessions: sessionNames.map((sessionName, index) => ({
        name: sessionName,
        order: index,
      })),
      day_mode: form.dayMode,
      order: pkg?.order ?? nextOrder,
    };

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        pkg ? `/api/packages/${pkg._id}` : "/api/packages",
        {
          method: pkg ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError("Could not save event.");
        return;
      }
      onSaved(data.package as PackageItem);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <BackButton fallbackHref={EVENTS_SETTINGS_HREF} />
      <section>
        <h2 className="text-xl font-semibold tracking-tight">
          {pkg ? "Edit event" : "New event"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What clients book from your profile.
        </p>
      </section>

      <SettingsSection title="Details">
        <div className={settingsCardClassName}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-name">Name</Label>
            <Input
              id="event-name"
              className={inputClassName}
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Nikah & Sanding"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-description">Description (optional)</Label>
            <Textarea
              id="event-description"
              className="min-h-24 bg-white/60 text-sm dark:bg-white/5"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Same day"
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Sessions"
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setForm((current) => ({
                ...current,
                sessions: [...current.sessions, { id: createRowId(), name: "" }],
              }))
            }
          >
            <IconPlus />
            Add session
          </Button>
        }
      >
        <div className={settingsCardClassName}>
          <p className="text-xs text-muted-foreground">
            Clients book one time slot for each session.
          </p>
          <SortableList
            items={form.sessions}
            getItemId={(session) => session.id}
            onReorder={(sessions) =>
              setForm((current) => ({ ...current, sessions }))
            }
            className="gap-2"
            renderItem={(session, index) => (
              <div className="flex items-center gap-2">
                <Input
                  className={inputClassName}
                  value={session.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sessions: current.sessions.map((item) =>
                        item.id === session.id
                          ? { ...item, name: event.target.value }
                          : item
                      ),
                    }))
                  }
                  placeholder={
                    form.sessions.length === 1
                      ? form.name.trim() || "Session name"
                      : index === 0
                        ? "Nikah"
                        : index === 1
                          ? "Sanding"
                          : `Session ${index + 1}`
                  }
                  aria-label={`Session ${index + 1} name`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={form.sessions.length === 1}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      sessions: current.sessions.filter(
                        (item) => item.id !== session.id
                      ),
                    }))
                  }
                  aria-label={`Remove session ${index + 1}`}
                >
                  <IconTrash />
                </Button>
              </div>
            )}
          />

          {form.sessions.length > 1 ? (
            <div className="flex flex-col gap-1.5">
              <Label>Sessions are on</Label>
              <div
                className="grid grid-cols-2 gap-2"
                role="radiogroup"
                aria-label="Sessions are on"
              >
                {DAY_MODE_OPTIONS.map((option) => {
                  const selected = form.dayMode === option.value;
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      variant={selected ? "default" : "outline"}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          dayMode: option.value,
                        }))
                      }
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {form.dayMode === "same_day"
                  ? "Clients book every session on the same date."
                  : "Clients book each session on a different date."}
              </p>
            </div>
          ) : null}
        </div>
      </SettingsSection>

      {chargeBy === "style" ? (
        <SettingsSection title="Pricing">
          <div className={settingsCardClassName}>
            <p className="text-muted-foreground">
              You charge by style, so prices are set on your styles.
            </p>
          </div>
        </SettingsSection>
      ) : (
        <>
          {regionPricesPerEvent ? (
            <SettingsSection title="Price by state">
              <RegionPriceList
                value={form.regionPrices}
                onChange={(regionPrices) =>
                  setForm((current) => ({ ...current, regionPrices }))
                }
              />
              <p className="text-xs text-muted-foreground">
                The full event price for a venue in that state, travel
                included. Leave a state blank if you don&apos;t serve it.
              </p>
            </SettingsSection>
          ) : (
            <SettingsSection title="Price">
              <div className={settingsCardClassName}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="event-price">Price (RM, optional)</Label>
                  <Input
                    id="event-price"
                    className={inputClassName}
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                    placeholder="1500"
                  />
                </div>
              </div>
            </SettingsSection>
          )}

          <SettingsSection title="Deposit">
            <div className={settingsCardClassName}>
              <DepositField
                label="Deposit (optional)"
                value={form.deposit}
                type={form.depositType}
                inputClassName={inputClassName}
                onValueChange={(deposit) =>
                  setForm((current) => ({ ...current, deposit }))
                }
                onTypeChange={(depositType) =>
                  setForm((current) => ({ ...current, depositType }))
                }
              />
            </div>
          </SettingsSection>
        </>
      )}

      <SettingsFeedback error={error} />
      <Button
        type="button"
        size="lg"
        className="min-h-11"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
