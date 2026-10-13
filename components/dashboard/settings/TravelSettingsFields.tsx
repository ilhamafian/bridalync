"use client";

import { useMemo, useState } from "react";
import {
  IconBed,
  IconCar,
  IconMap,
  IconMapPin,
  IconPackage,
  IconRoute,
  IconUserHeart,
} from "@tabler/icons-react";

import {
  IconBadge,
  RowText,
  SettingsSection,
  settingsCardClassName,
  settingsListClassName,
  settingsRowClassName,
} from "@/components/dashboard/settings/SettingsUi";
import { LocationMapPicker, MapsProvider } from "@/components/LocationMapPicker";
import { RegionPriceList } from "@/components/RegionPriceList";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVenueRegions, venueKey } from "@/hooks/use-venue-regions";
import { cn } from "@/lib/utils";
import type { Address } from "@/schemas/addressSchema";
import type {
  AccommodationProvider,
  RegionId,
  TravelMode,
  TravelRegionMode,
  TravelSetting,
} from "@/schemas/settingSchema";
import {
  getRegionLabel,
  MALAYSIA_REGIONS,
  parseRegionPriceInputs,
  toRegionPriceInputs,
  type RegionPriceInputs,
} from "@/utils/booking/regions";
import { LONG_DISTANCE_THRESHOLD_KM } from "@/utils/booking/travel";
import type { StyleTerms } from "@/utils/styleTerms";

type StatesTab = "areas" | "travel-days";
type ChargeBy = "package" | "style";

export const DISABLED_TRAVEL_LOCATION: Address = {
  placeId: "travel-disabled",
  formattedAddress: "Travel not enabled",
  displayName: "Travel not enabled",
  location: { lat: 0, lng: 0 },
};

/** Travel settings as saved by the form; `long_distance_rate_per_km: null` clears it. */
export type TravelSettingsPayload = Omit<
  TravelSetting,
  "long_distance_rate_per_km"
> & { long_distance_rate_per_km?: number | null };

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-white/60 px-3 text-sm text-foreground dark:bg-white/5",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function savedLocation(travel: TravelSetting): Address | null {
  return travel.location.placeId !== DISABLED_TRAVEL_LOCATION.placeId
    ? travel.location
    : null;
}

export type BaseRegionStatus = "none" | "loading" | "ready" | "error";

export function useTravelSettingsForm(initial: TravelSetting) {
  const [saved, setSaved] = useState(initial);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [ratePerKm, setRatePerKm] = useState(
    String(initial.rate_per_km || "")
  );
  const [longDistanceRatePerKm, setLongDistanceRatePerKm] = useState(
    String(initial.long_distance_rate_per_km ?? "")
  );
  const [location, setLocation] = useState<Address | null>(
    savedLocation(initial)
  );
  const [mode, setMode] = useState<TravelMode>(initial.mode ?? "distance");
  const [regionMode, setRegionMode] = useState<TravelRegionMode>(
    initial.region_mode ?? "fixed"
  );
  const [regionPrices, setRegionPrices] = useState<RegionPriceInputs>(() =>
    toRegionPriceInputs(initial.region_prices)
  );
  const [accommodationBy, setAccommodationBy] = useState<AccommodationProvider>(
    initial.accommodation_by ?? "self"
  );
  const [bufferRegions, setBufferRegions] = useState<RegionId[]>(
    initial.travel_buffer_regions ?? []
  );
  const [unservedRegions, setUnservedRegions] = useState<RegionId[]>(
    initial.unserved_regions ?? []
  );
  const [statesTab, setStatesTab] = useState<StatesTab>("areas");

  const baseLocations = useMemo(() => [location], [location]);
  const venueRegions = useVenueRegions(baseLocations, !!location);
  const detectedRegion = location
    ? venueRegions[venueKey(location.location)]
    : undefined;
  const baseRegionStatus: BaseRegionStatus = !location
    ? "none"
    : (detectedRegion?.status ?? "loading");
  const baseRegion: RegionId | null =
    detectedRegion?.status === "ready"
      ? detectedRegion.regionId
      : baseRegionStatus === "loading" || baseRegionStatus === "none"
        ? (saved.base_region ?? null)
        : null;

  const hiddenPriceRegions = unservedRegions.filter((id) => id !== baseRegion);

  function reset(next: TravelSetting) {
    setSaved(next);
    setEnabled(next.enabled);
    setRatePerKm(String(next.rate_per_km || ""));
    setLongDistanceRatePerKm(String(next.long_distance_rate_per_km ?? ""));
    setLocation(savedLocation(next));
    setMode(next.mode ?? "distance");
    setRegionMode(next.region_mode ?? "fixed");
    setRegionPrices(toRegionPriceInputs(next.region_prices));
    setAccommodationBy(next.accommodation_by ?? "self");
    setBufferRegions(next.travel_buffer_regions ?? []);
    setUnservedRegions(next.unserved_regions ?? []);
  }

  /** Validates the form; `chargeBy` decides whether per-event state pricing applies. */
  function buildTravel(
    chargeBy: ChargeBy
  ): { travel: TravelSettingsPayload } | { error: string } {
    if (baseRegionStatus === "loading") {
      return { error: "Still detecting your base state. Try again in a moment." };
    }
    if (accommodationBy === "client" && !baseRegion) {
      return {
        error:
          "Pick a base location in Malaysia so your base state can be detected.",
      };
    }
    const accommodation = {
      accommodation_by: accommodationBy,
      ...(baseRegion ? { base_region: baseRegion } : {}),
      travel_buffer_regions: bufferRegions.filter(
        (id) => id !== baseRegion && !unservedRegions.includes(id)
      ),
      unserved_regions: hiddenPriceRegions,
    };

    if (enabled && mode === "region") {
      const parsedPrices = parseRegionPriceInputs(regionPrices);
      if (!parsedPrices) {
        return {
          error: "Enter a valid price for each state, or leave it blank.",
        };
      }
      const effectiveRegionMode = chargeBy === "package" ? regionMode : "fixed";
      if (
        effectiveRegionMode === "fixed" &&
        Object.keys(parsedPrices).every((id) =>
          hiddenPriceRegions.includes(id as RegionId)
        )
      ) {
        return { error: "Enter a price for at least one state you serve." };
      }

      return {
        travel: {
          enabled: true,
          mode: "region",
          rate_per_km: saved.rate_per_km,
          region_mode: effectiveRegionMode,
          region_prices: parsedPrices,
          location: location ?? saved.location,
          ...accommodation,
        },
      };
    }

    if (enabled) {
      const parsedRate = Number.parseFloat(ratePerKm);
      if (Number.isNaN(parsedRate) || parsedRate < 0) {
        return { error: "Enter a valid travel rate per km." };
      }
      const longDistanceRaw = longDistanceRatePerKm.trim();
      const parsedLongDistanceRate =
        longDistanceRaw === "" ? null : Number.parseFloat(longDistanceRaw);
      if (
        parsedLongDistanceRate !== null &&
        (Number.isNaN(parsedLongDistanceRate) || parsedLongDistanceRate < 0)
      ) {
        return {
          error: `Enter a valid rate for trips over ${LONG_DISTANCE_THRESHOLD_KM} km.`,
        };
      }
      if (!location) {
        return { error: "Pick a base location on the map." };
      }

      return {
        travel: {
          enabled: true,
          mode: "distance",
          rate_per_km: parsedRate,
          long_distance_rate_per_km: parsedLongDistanceRate,
          location,
          ...accommodation,
        },
      };
    }

    return {
      travel: {
        enabled: false,
        rate_per_km: 0,
        location: location ?? DISABLED_TRAVEL_LOCATION,
        ...accommodation,
      },
    };
  }

  return {
    enabled,
    setEnabled,
    ratePerKm,
    setRatePerKm,
    longDistanceRatePerKm,
    setLongDistanceRatePerKm,
    location,
    setLocation,
    mode,
    setMode,
    regionMode,
    setRegionMode,
    regionPrices,
    setRegionPrices,
    accommodationBy,
    setAccommodationBy,
    baseRegion,
    baseRegionStatus,
    bufferRegions,
    setBufferRegions,
    unservedRegions,
    setUnservedRegions,
    statesTab,
    setStatesTab,
    hiddenPriceRegions,
    reset,
    buildTravel,
  };
}

export type TravelSettingsForm = ReturnType<typeof useTravelSettingsForm>;

function baseRegionText(status: BaseRegionStatus, baseRegion: RegionId | null) {
  switch (status) {
    case "none":
      return "Your base state is detected from this location.";
    case "loading":
      return "Detecting your base state…";
    case "error":
      return "Couldn't detect your base state. Pick the location again.";
    case "ready":
      return baseRegion
        ? `Base state: ${getRegionLabel(baseRegion)}`
        : "This location isn't in a Malaysian state.";
  }
}

export function TravelSettingsFields({
  form,
  chargeBy,
  styleTerms,
}: {
  form: TravelSettingsForm;
  chargeBy: ChargeBy;
  styleTerms: StyleTerms;
}) {
  const {
    enabled,
    mode,
    regionMode,
    baseRegion,
    unservedRegions,
    bufferRegions,
  } = form;
  const travelDayRegions = MALAYSIA_REGIONS.filter(
    (region) =>
      region.id !== baseRegion && !unservedRegions.includes(region.id)
  );

  return (
    <>
      <SettingsSection title="Travel fee">
        <div className={settingsListClassName}>
          <label className={cn(settingsRowClassName, "cursor-pointer")}>
            <IconBadge icon={IconCar} />
            <RowText
              title="Enable travel fee"
              description="Charge clients for travelling to their venue."
            />
            <Switch checked={enabled} onCheckedChange={form.setEnabled} />
          </label>
        </div>
      </SettingsSection>

      {enabled ? (
        <SettingsSection title="Charge by">
          <RadioGroup
            value={mode}
            onValueChange={(value) => form.setMode(value as TravelMode)}
            className={settingsListClassName}
          >
            <label className={cn(settingsRowClassName, "cursor-pointer")}>
              <IconBadge icon={IconRoute} />
              <RowText
                title="By distance"
                description="A rate per km from your base location."
              />
              <RadioGroupItem value="distance" aria-label="By distance" />
            </label>
            <label className={cn(settingsRowClassName, "cursor-pointer")}>
              <IconBadge icon={IconMap} />
              <RowText
                title="By state"
                description="A price for each state you serve."
              />
              <RadioGroupItem value="region" aria-label="By state" />
            </label>
          </RadioGroup>
        </SettingsSection>
      ) : null}

      <MapsProvider>
        <SettingsSection title="Base location">
          <div className={settingsCardClassName}>
            <LocationMapPicker
              value={form.location}
              onChange={form.setLocation}
            />
            <p className="text-xs text-muted-foreground">
              {baseRegionText(form.baseRegionStatus, baseRegion)}
            </p>
          </div>
        </SettingsSection>
      </MapsProvider>

      {enabled && mode === "region" ? (
        <>
          {chargeBy === "package" ? (
            <SettingsSection title="State pricing">
              <RadioGroup
                value={regionMode}
                onValueChange={(value) =>
                  form.setRegionMode(value as TravelRegionMode)
                }
                className={settingsListClassName}
              >
                <label className={cn(settingsRowClassName, "cursor-pointer")}>
                  <IconBadge icon={IconMapPin} />
                  <RowText
                    title="Fixed charge"
                    description="One price per state, added to every event."
                  />
                  <RadioGroupItem value="fixed" aria-label="Fixed charge" />
                </label>
                <label className={cn(settingsRowClassName, "cursor-pointer")}>
                  <IconBadge icon={IconPackage} />
                  <RowText
                    title="Different charge by event"
                    description="Each event has its own price per state."
                  />
                  <RadioGroupItem
                    value="per_event"
                    aria-label="Different charge by event"
                  />
                </label>
              </RadioGroup>
            </SettingsSection>
          ) : null}

          {chargeBy === "package" && regionMode === "per_event" ? (
            <div className={settingsCardClassName}>
              <p className="text-muted-foreground">
                Set each event&apos;s price per state in Events &amp;{" "}
                {styleTerms.many}.
                The price already includes travel, so clients see one price for
                the event.
              </p>
            </div>
          ) : (
            <SettingsSection title="Prices">
              <RegionPriceList
                value={form.regionPrices}
                onChange={form.setRegionPrices}
                feeHint="extra"
                hiddenRegions={form.hiddenPriceRegions}
              />
              <p className="text-xs text-muted-foreground">
                The state&apos;s price is included in the booking price, not
                shown as a separate travel fee. Leave a state blank if you
                don&apos;t serve it. When sessions are in different states, the
                highest price is charged once.
              </p>
            </SettingsSection>
          )}
        </>
      ) : null}

      {enabled && mode === "distance" ? (
        <>
          <SettingsSection title="Rate">
            <div className={settingsCardClassName}>
              <Field label="Rate per km (RM)">
                <Input
                  className={inputClassName}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.ratePerKm}
                  onChange={(event) => form.setRatePerKm(event.target.value)}
                  placeholder="1.00"
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                Travel is charged as a round trip — to the client and back to
                your base. For example, 10 km away at RM 1/km adds RM 20 to the
                booking.
              </p>
            </div>
          </SettingsSection>
          <SettingsSection title={`Over ${LONG_DISTANCE_THRESHOLD_KM} km`}>
            <div className={settingsCardClassName}>
              <Field label="Rate per km (RM)">
                <Input
                  className={inputClassName}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.longDistanceRatePerKm}
                  onChange={(event) =>
                    form.setLongDistanceRatePerKm(event.target.value)
                  }
                  placeholder={form.ratePerKm || "1.50"}
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                When the client is more than {LONG_DISTANCE_THRESHOLD_KM} km
                away, this rate is used for the whole trip instead. For
                example, 120 km away at RM 1.50/km adds RM 360. Leave blank to
                use your normal rate.
              </p>
            </div>
          </SettingsSection>
        </>
      ) : null}

      <SettingsSection title="Out-of-state accommodation & transport">
        <RadioGroup
          value={form.accommodationBy}
          onValueChange={(value) =>
            form.setAccommodationBy(value as AccommodationProvider)
          }
          className={settingsListClassName}
        >
          <label className={cn(settingsRowClassName, "cursor-pointer")}>
            <IconBadge icon={IconBed} />
            <RowText
              title="Provided by me"
              description="You arrange your own stay and transport."
            />
            <RadioGroupItem value="self" aria-label="Provided by me" />
          </label>
          <label className={cn(settingsRowClassName, "cursor-pointer")}>
            <IconBadge icon={IconUserHeart} />
            <RowText
              title="Provided by the client"
              description="Clients outside your base state are told they must provide them."
            />
            <RadioGroupItem value="client" aria-label="Provided by the client" />
          </label>
        </RadioGroup>
        {form.accommodationBy === "client" ? (
          <div className={settingsCardClassName}>
            <p className="text-xs text-muted-foreground">
              {baseRegion
                ? `When a session's venue is outside ${getRegionLabel(baseRegion)}, the client must agree to provide your accommodation and transport before continuing their booking.`
                : "Pick your base location above so your base state can be detected."}
            </p>
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection title="States">
        <Tabs
          value={form.statesTab}
          onValueChange={(value) => form.setStatesTab(value as StatesTab)}
          className="gap-3"
        >
          <TabsList className="grid h-10! w-full grid-cols-2 bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm dark:bg-white/10 dark:ring-white/15">
            <TabsTrigger value="areas" className="text-sm">
              Service areas
            </TabsTrigger>
            <TabsTrigger value="travel-days" className="text-sm">
              Travel days
            </TabsTrigger>
          </TabsList>

          <TabsContent value="areas" className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              States you take bookings in. Clients with a venue in a state
              that&apos;s off are asked to change location.
              {baseRegion
                ? ` Your base state (${getRegionLabel(baseRegion)}) is always served.`
                : null}
            </p>
            <div className={settingsListClassName}>
              {MALAYSIA_REGIONS.filter(
                (region) => region.id !== baseRegion
              ).map((region) => {
                const served = !unservedRegions.includes(region.id);
                return (
                  <label
                    key={region.id}
                    className={cn(settingsRowClassName, "cursor-pointer py-2.5")}
                  >
                    <RowText
                      title={region.label}
                      description={served ? undefined : "Clients can't book here"}
                    />
                    <Switch
                      checked={served}
                      onCheckedChange={(checked) =>
                        form.setUnservedRegions((current) =>
                          checked
                            ? current.filter((id) => id !== region.id)
                            : [...current, region.id]
                        )
                      }
                      aria-label={`Take bookings in ${region.label}`}
                    />
                  </label>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="travel-days" className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              For bookings in these states, the day before and after each
              session is blocked so other clients can&apos;t book them. Applies
              once a booking holds its slot (booked, or a request you
              approved). Only states you serve are listed.
            </p>
            {travelDayRegions.length > 0 ? (
              <div className={settingsListClassName}>
                {travelDayRegions.map((region) => (
                  <label
                    key={region.id}
                    className={cn(settingsRowClassName, "cursor-pointer py-2.5")}
                  >
                    <RowText title={region.label} />
                    <Switch
                      checked={bufferRegions.includes(region.id)}
                      onCheckedChange={(checked) =>
                        form.setBufferRegions((current) =>
                          checked
                            ? [...current, region.id]
                            : current.filter((id) => id !== region.id)
                        )
                      }
                      aria-label={`Block travel days for ${region.label}`}
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className={settingsCardClassName}>
                <p className="text-muted-foreground">
                  Turn on a state in Service areas to set travel days for it.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SettingsSection>
    </>
  );
}
