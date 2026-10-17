import type {
  BookingClientDetails,
  ClientDetailsInput,
  ClientInfoSetting,
  ClientQuestion,
  InstagramRequirement,
} from "@/schemas/clientInfoSchema";
import {
  MAX_BOOKING_PAX,
  type PartyMember,
  type PartyMemberInput,
} from "@/schemas/bookingSchema";

const INSTAGRAM_USERNAME_PATTERN = /^[A-Za-z0-9._]{1,30}$/;

export function getInstagramRequirement(
  clientInfo: ClientInfoSetting | undefined
): InstagramRequirement {
  return clientInfo?.instagram ?? "off";
}

export function getClientQuestions(
  clientInfo: ClientInfoSetting | undefined
): ClientQuestion[] {
  return clientInfo?.questions ?? [];
}

/** Accepts "name", "@name" or a pasted profile URL. */
export function normalizeInstagramUsername(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0];
}

export function isValidInstagramUsername(username: string): boolean {
  return INSTAGRAM_USERNAME_PATTERN.test(username);
}

/**
 * Instagram on a manual booking: blank clears it, and a value is optional even when
 * the stylist's client-info setting requires one. Throws when the value isn't a username.
 */
export function resolveOptionalInstagram(raw: string | undefined): string | undefined {
  const username = normalizeInstagramUsername(raw ?? "");
  if (!username) return undefined;
  if (!isValidInstagramUsername(username)) {
    throw new Error("Enter a valid Instagram username.");
  }
  return username;
}

export function buildInstagramProfileUrl(username: string): string {
  return `https://instagram.com/${encodeURIComponent(username)}`;
}

export function isClientQuestionAnswered(
  question: ClientQuestion,
  answer: string | undefined
): boolean {
  const value = answer?.trim() ?? "";
  if (!value) return false;
  return question.options.length === 0 || question.options.includes(value);
}

/** Whether the details step can continue with these values. */
export function isClientInfoComplete(
  clientInfo: ClientInfoSetting | undefined,
  input: { instagram: string; answers: Record<string, string> }
): boolean {
  const requirement = getInstagramRequirement(clientInfo);
  if (requirement !== "off") {
    const username = normalizeInstagramUsername(input.instagram);
    if (username ? !isValidInstagramUsername(username) : requirement === "required") {
      return false;
    }
  }
  return getClientQuestions(clientInfo).every((question) => {
    const answer = input.answers[question.id];
    if (!answer?.trim()) return !question.required;
    return isClientQuestionAnswered(question, answer);
  });
}

/**
 * Validates what the client sent against the stylist's current settings.
 * Throws with a client-facing message; unknown questions and disabled fields are dropped.
 */
export function resolveClientDetails(
  clientInfo: ClientInfoSetting | undefined,
  input: ClientDetailsInput | undefined
): BookingClientDetails | undefined {
  const details: BookingClientDetails = {};

  const requirement = getInstagramRequirement(clientInfo);
  if (requirement !== "off") {
    const username = normalizeInstagramUsername(input?.instagram ?? "");
    if (username) {
      if (!isValidInstagramUsername(username)) {
        throw new Error("Enter a valid Instagram username.");
      }
      details.instagram = username;
    } else if (requirement === "required") {
      throw new Error("Instagram username is required.");
    }
  }

  const answersById = new Map(
    (input?.answers ?? []).map((item) => [item.questionId, item.answer.trim()])
  );
  const answers: NonNullable<BookingClientDetails["answers"]> = [];
  for (const question of getClientQuestions(clientInfo)) {
    const answer = answersById.get(question.id) ?? "";
    if (!answer) {
      if (question.required) {
        throw new Error(`Please answer "${question.title}".`);
      }
      continue;
    }
    if (!isClientQuestionAnswered(question, answer)) {
      throw new Error(`Pick one of the options for "${question.title}".`);
    }
    answers.push({ questionId: question.id, title: question.title, answer });
  }
  if (answers.length > 0) details.answers = answers;

  return Object.keys(details).length > 0 ? details : undefined;
}

/** Headcount stored on the booking; older bookings without `pax` count as 1. */
export function getBookingPax(booking: {
  pax?: number;
  party?: PartyMember[];
}): number {
  if (typeof booking.pax === "number" && booking.pax >= 1) {
    return Math.min(booking.pax, MAX_BOOKING_PAX);
  }
  if (booking.party?.length) {
    return Math.min(booking.party.length, MAX_BOOKING_PAX);
  }
  return 1;
}

/**
 * Party list for display. Legacy bookings (no `party`) become one member from
 * the contact name + top-level `clientDetails`.
 */
export function getBookingParty(booking: {
  contact: { name: string };
  clientDetails?: BookingClientDetails | null;
  party?: PartyMember[];
}): PartyMember[] {
  if (booking.party && booking.party.length > 0) {
    return booking.party;
  }
  return [
    {
      name: booking.contact.name,
      ...(booking.clientDetails
        ? { clientDetails: booking.clientDetails }
        : {}),
    },
  ];
}

/**
 * Validates every party member against Client information settings.
 * When `party` is omitted, builds a single member from the contact + legacy details.
 */
export function resolveBookingParty(
  clientInfo: ClientInfoSetting | undefined,
  contactName: string,
  pax: number,
  party: PartyMemberInput[] | undefined,
  legacyClientDetails: ClientDetailsInput | undefined
): {
  pax: number;
  party: PartyMember[];
  clientDetails: BookingClientDetails | undefined;
} {
  const headcount = Math.min(Math.max(1, pax), MAX_BOOKING_PAX);
  const bookerName = contactName.trim();
  if (!bookerName) {
    throw new Error("Name is required.");
  }

  if (party) {
    if (party.length !== headcount) {
      throw new Error("Add details for each person.");
    }
    if (party[0].name.trim() !== bookerName) {
      throw new Error("The first person must match the booking contact name.");
    }
    const resolved: PartyMember[] = party.map((member) => {
      const name = member.name.trim();
      if (!name) {
        throw new Error("Every person needs a name.");
      }
      const details = resolveClientDetails(clientInfo, member.clientDetails);
      return {
        name,
        ...(details ? { clientDetails: details } : {}),
      };
    });
    return {
      pax: headcount,
      party: resolved,
      clientDetails: resolved[0]?.clientDetails,
    };
  }

  if (headcount !== 1) {
    throw new Error("Add details for each person.");
  }
  const details = resolveClientDetails(clientInfo, legacyClientDetails);
  return {
    pax: 1,
    party: [
      {
        name: bookerName,
        ...(details ? { clientDetails: details } : {}),
      },
    ],
    clientDetails: details,
  };
}

/**
 * Manual / dashboard bookings: Instagram is always optional. Builds `party` from
 * the contact, optional booker Instagram, and any supplied party list.
 */
export function resolveManualBookingParty(
  contactName: string,
  pax: number,
  party: PartyMemberInput[] | undefined,
  bookerInstagram: string | undefined
): {
  pax: number;
  party: PartyMember[];
  clientDetails: BookingClientDetails | undefined;
} {
  const headcount = Math.min(Math.max(1, pax), MAX_BOOKING_PAX);
  const bookerName = contactName.trim();
  if (!bookerName) {
    throw new Error("Name is required.");
  }

  const bookerDetails: BookingClientDetails | undefined = bookerInstagram
    ? { instagram: bookerInstagram }
    : undefined;

  if (party && party.length > 0) {
    if (party.length !== headcount) {
      throw new Error("Add a name for each person.");
    }
    if (party[0].name.trim() !== bookerName) {
      throw new Error("The first person must match the booking contact name.");
    }
    const resolved: PartyMember[] = party.map((member, index) => {
      const name = member.name.trim();
      if (!name) {
        throw new Error("Every person needs a name.");
      }
      if (index === 0) {
        const fromMember = member.clientDetails?.instagram
          ? resolveOptionalInstagram(member.clientDetails.instagram)
          : undefined;
        const instagram = fromMember ?? bookerInstagram;
        return {
          name,
          ...(instagram ? { clientDetails: { instagram } } : {}),
        };
      }
      const instagram = member.clientDetails?.instagram
        ? resolveOptionalInstagram(member.clientDetails.instagram)
        : undefined;
      return {
        name,
        ...(instagram ? { clientDetails: { instagram } } : {}),
      };
    });
    return {
      pax: headcount,
      party: resolved,
      clientDetails: resolved[0]?.clientDetails,
    };
  }

  if (headcount !== 1) {
    throw new Error("Add a name for each person.");
  }

  return {
    pax: 1,
    party: [
      {
        name: bookerName,
        ...(bookerDetails ? { clientDetails: bookerDetails } : {}),
      },
    ],
    clientDetails: bookerDetails,
  };
}

export const MOODBOARD_PDF_TYPE = "application/pdf";

export function isMoodboardPdfUrl(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}

/** Blob path prefix for moodboard files a client attached to a booking. */
export function getMoodboardPrefix(freelancerUserId: string, bookingId: string) {
  return `booking-moodboards/${freelancerUserId}/${bookingId}/`;
}
