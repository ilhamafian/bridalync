"use client";
import { SettingsCard, SettingsList, GlassRadioGroup } from "@/components/dashboard/GlassCard";

import { useMemo, useState } from "react";
import {
  IconBed,
  IconCar,
  IconMap,
  IconRoute,
  IconUserHeart,
} from "@tabler/icons-react";

import { IconBadge, RowText, SettingsSection, settingsRowClassName } from "@/components/dashboard/settings/SettingsUi";
import { LocationMapPicker, MapsProvider } from "@/components/LocationMapPicker";
import { RegionPriceList } from "@/components/RegionPriceList";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVenueRegions, venueKey } from "@/hooks/use-venue-regions";
import { cn } from "@/lib/utils";
import type { Address } from "@/schemas/addressSchema";
import type {
  AccommodationProvider,
  RegionId,
  TravelMode,
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
    setRegionPrices(toRegionPriceInputs(next.region_prices));
    setAccommodationBy(next.accommodation_by ?? "self");
    setBufferRegions(next.travel_buffer_regions ?? []);
    setUnservedRegions(next.unserved_regions ?? []);
  }

  /**
   * Validates the form. Charging by event always prices each event per state.
   * Charging by style keeps one added-on price per state.
   */
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

    if (enabled && mode === "region" && chargeBy === "package") {
      return {
        travel: {
          enabled: true,
          mode: "region",
          rate_per_km: saved.rate_per_km,
          region_mode: "per_event",
          region_prices: saved.region_prices,
          location: location ?? saved.location,
          ...accommodation,
        },
      };
    }

    if (enabled && mode === "region") {
      const parsedPrices = parseRegionPriceInputs(regionPrices);
      if (!parsedPrices) {
        return {
          error: "Enter a valid price for each state, or leave it blank.",
        };
      }
      if (
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
          region_mode: "fixed",
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

function RateRow({
  id,
  label,
  description,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div
      className={cn(
        settingsRowClassName,
        "hover:bg-transparent dark:hover:bg-transparent"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <div className="flex h-9 w-32 shrink-0 items-center rounded-md border border-border bg-white/60 px-2 text-sm focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 dark:bg-white/5">
        <span className="pr-1 text-muted-foreground">RM</span>
        <input
          id={id}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full w-full min-w-0 bg-transparent text-right outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
}

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
  const { enabled, mode, baseRegion, unservedRegions, bufferRegions } = form;
  const travelDayRegions = MALAYSIA_REGIONS.filter(
    (region) =>
      region.id !== baseRegion && !unservedRegions.includes(region.id)
  );

  return (
    <>
      <SettingsSection title="Travel fee">
        <SettingsList >
          <label className={cn(settingsRowClassName, "cursor-pointer")}>
            <IconBadge icon={IconCar} />
            <RowText
              title="Enable travel fee"
              description="Charge clients for travelling to their venue."
            />
            <Switch checked={enabled} onCheckedChange={form.setEnabled} />
          </label>
        </SettingsList>
      </SettingsSection>

      {enabled ? (
        <SettingsSection title="Charge by">
          <GlassRadioGroup
            value={mode}
            onValueChange={(value) => form.setMode(value as TravelMode)}
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
                description={
                  chargeBy === "package"
                    ? "Each event has its own price for the states you serve."
                    : "A price for each state you serve."
                }
              />
              <RadioGroupItem value="region" aria-label="By state" />
            </label>
          </GlassRadioGroup>
        </SettingsSection>
      ) : null}

      <MapsProvider>
        <SettingsSection title="Base location">
          <SettingsCard >
            <LocationMapPicker
              value={form.location}
              onChange={form.setLocation}
            />
            <p className="text-xs text-muted-foreground">
              {baseRegionText(form.baseRegionStatus, baseRegion)}
            </p>
          </SettingsCard>
        </SettingsSection>
      </MapsProvider>

      {enabled && mode === "region" && chargeBy === "package" ? (
        <SettingsCard>
          <p className="text-muted-foreground">
            Set each event&apos;s price per state in Events &amp;{" "}
            {styleTerms.many}. The price already includes travel, so clients
            see one price for the event.
          </p>
        </SettingsCard>
      ) : null}

      {enabled && mode === "region" && chargeBy !== "package" ? (
        <SettingsSection title="Prices">
          <RegionPriceList
            value={form.regionPrices}
            onChange={form.setRegionPrices}
            feeHint="extra"
            hiddenRegions={form.hiddenPriceRegions}
          />
          <p className="text-xs text-muted-foreground">
            The state&apos;s price is included in the booking price, not shown
            as a separate travel fee. Leave a state blank if you don&apos;t
            serve it. When sessions are in different states, the highest price
            is charged once.
          </p>
        </SettingsSection>
      ) : null}

      {enabled && mode === "distance" ? (
        <SettingsSection title="Rate">
          <SettingsList>
            <RateRow
              id="travel-rate-per-km"
              label="Standard"
              description="Per km, charged as a round trip."
              value={form.ratePerKm}
              onChange={form.setRatePerKm}
              placeholder="1.00"
            />
            <RateRow
              id="travel-long-distance-rate"
              label={`Over ${LONG_DISTANCE_THRESHOLD_KM} km`}
              description="Optional. Replaces the standard rate for the whole trip."
              value={form.longDistanceRatePerKm}
              onChange={form.setLongDistanceRatePerKm}
              placeholder="—"
            />
          </SettingsList>
          <p className="text-xs text-muted-foreground">
            For example, 10 km away at RM 1/km adds RM 20, and 120 km at RM
            1.50/km adds RM 360.
          </p>
        </SettingsSection>
      ) : null}

      <SettingsSection title="Out-of-state accommodation & transport">
        <GlassRadioGroup
          value={form.accommodationBy}
          onValueChange={(value) =>
            form.setAccommodationBy(value as AccommodationProvider)
          }
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
        </GlassRadioGroup>
        {form.accommodationBy === "client" ? (
          <SettingsCard >
            <p className="text-xs text-muted-foreground">
              {baseRegion
                ? `When a session's venue is outside ${getRegionLabel(baseRegion)}, the client must agree to provide your accommodation and transport before continuing their booking.`
                : "Pick your base location above so your base state can be detected."}
            </p>
          </SettingsCard>
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
              Coverage
            </TabsTrigger>
            <TabsTrigger value="travel-days" className="text-sm">
              Block before travel
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
            <SettingsList >
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
            </SettingsList>
          </TabsContent>

          <TabsContent value="travel-days" className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              For bookings in these states, the day before and after each
              session is blocked so other clients can&apos;t book them. Applies
              once a booking holds its slot (booked, or a request you
              approved). Only states you serve are listed.
            </p>
            {travelDayRegions.length > 0 ? (
              <SettingsList >
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
              </SettingsList>
            ) : (
              <SettingsCard >
                <p className="text-muted-foreground">
                  Turn on a state in Coverage to set travel days for it.
                </p>
              </SettingsCard>
            )}
          </TabsContent>
        </Tabs>
      </SettingsSection>
    </>
  );
}
