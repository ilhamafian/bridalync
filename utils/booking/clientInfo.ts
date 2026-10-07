import type {
  BookingClientDetails,
  ClientDetailsInput,
  ClientInfoSetting,
  ClientQuestion,
  InstagramRequirement,
} from "@/schemas/clientInfoSchema";

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
