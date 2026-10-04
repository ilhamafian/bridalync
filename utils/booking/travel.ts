import { isSameDay } from "date-fns";

import type { Address } from "@/schemas/addressSchema";
import type { SessionForm } from "@/schemas/sessionSchema";
import type { TimeSlot } from "@/schemas/settingSchema";

export type TravelSessionInput = Pick<
  SessionForm,
  "client_key" | "date" | "time_slot"
> & {
  location?: Address;
};

function buildLocationKey(location: Address["location"]): string {
  return `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
}

export function getTimeSlotIndex(
  slot: TimeSlot,
  timeSlots: TimeSlot[]
): number {
  return timeSlots.findIndex(
    (entry) =>
      entry.startTime === slot.startTime && entry.endTime === slot.endTime
  );
}

function sortSessionsForTravel(
  sessions: TravelSessionInput[],
  timeSlots: TimeSlot[]
): TravelSessionInput[] {
  return [...sessions].sort((left, right) => {
    const dateDiff = left.date.getTime() - right.date.getTime();
    if (dateDiff !== 0) return dateDiff;

    return (
      getTimeSlotIndex(left.time_slot, timeSlots) -
      getTimeSlotIndex(right.time_slot, timeSlots)
    );
  });
}

function canShareTravelCharge(
  previous: TravelSessionInput,
  current: TravelSessionInput,
  timeSlots: TimeSlot[]
): boolean {
  if (!previous.location || !current.location) return false;
  if (!isSameDay(previous.date, current.date)) return false;
  if (
    buildLocationKey(previous.location.location) !==
    buildLocationKey(current.location.location)
  ) {
    return false;
  }

  const previousSlotIndex = getTimeSlotIndex(previous.time_slot, timeSlots);
  const currentSlotIndex = getTimeSlotIndex(current.time_slot, timeSlots);

  if (previousSlotIndex < 0 || currentSlotIndex < 0) return false;

  return currentSlotIndex === previousSlotIndex + 1;
}

/** Sessions that share one round-trip travel charge. */
export function groupSessionsForTravelCharge(
  sessions: TravelSessionInput[],
  timeSlots: TimeSlot[]
): TravelSessionInput[][] {
  const sessionsWithLocation = sessions.filter((session) => session.location);
  if (sessionsWithLocation.length === 0) return [];

  const sortedSessions = sortSessionsForTravel(sessionsWithLocation, timeSlots);
  const groups: TravelSessionInput[][] = [[sortedSessions[0]]];

  for (const session of sortedSessions.slice(1)) {
    const currentGroup = groups[groups.length - 1];
    const previousSession = currentGroup[currentGroup.length - 1];

    if (canShareTravelCharge(previousSession, session, timeSlots)) {
      currentGroup.push(session);
      continue;
    }

    groups.push([session]);
  }

  return groups;
}

function roundUpTravelFeeRm(amount: number): number {
  return Math.ceil(amount * 10) / 10;
}

/** One-way distance above which `longDistanceRatePerKm` applies to the whole trip. */
export const LONG_DISTANCE_THRESHOLD_KM = 100;

export type CalculateTravelFeeInput = {
  sessions: TravelSessionInput[];
  timeSlots: TimeSlot[];
  ratePerKm: number;
  longDistanceRatePerKm?: number;
  distanceKmBySessionKey: Record<string, number | undefined>;
};

export function getTravelRatePerKm(
  distanceKm: number,
  ratePerKm: number,
  longDistanceRatePerKm?: number
) {
  return distanceKm > LONG_DISTANCE_THRESHOLD_KM &&
    longDistanceRatePerKm != null
    ? longDistanceRatePerKm
    : ratePerKm;
}

/** Round-trip travel fee: distanceKm × 2 × rate, grouped by slot/location rules. */
export function calculateTravelFeeRm(input: CalculateTravelFeeInput): number {
  const groups = groupSessionsForTravelCharge(
    input.sessions,
    input.timeSlots
  );

  let total = 0;

  for (const group of groups) {
    const distanceKm = input.distanceKmBySessionKey[group[0].client_key];
    if (distanceKm == null) continue;

    total +=
      distanceKm *
      2 *
      getTravelRatePerKm(
        distanceKm,
        input.ratePerKm,
        input.longDistanceRatePerKm
      );
  }

  return roundUpTravelFeeRm(total);
}
