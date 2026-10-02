import type { Booking } from "@/schemas/bookingSchema";

type ReviewableBooking = Pick<Booking, "status" | "sessions">;

export const MAX_REVIEW_IMAGES = 5;
/** Includes photos the client uploaded and then removed before submitting. */
export const MAX_REVIEW_IMAGE_UPLOADS_PER_BOOKING = 15;

/** Blob path prefix for photos attached to a client-submitted booking review. */
export function getReviewImagePrefix(freelancerUserId: string, bookingId: string) {
  return `review-images/${freelancerUserId}/bookings/${bookingId}/`;
}

/** True when `url` is a Vercel Blob URL uploaded for this booking's review. */
export function isReviewImageUrlForBooking(
  url: string,
  freelancerUserId: string,
  bookingId: string
) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".public.blob.vercel-storage.com") &&
      parsed.pathname.startsWith(
        `/${getReviewImagePrefix(freelancerUserId, bookingId)}`
      )
    );
  } catch {
    return false;
  }
}

/** Latest non-cancelled session date, used as the review's event date. */
export function getBookingEventDate(booking: ReviewableBooking): Date | null {
  const times = booking.sessions
    .filter((session) => session.status !== "cancelled")
    .map((session) => new Date(session.date).getTime())
    .filter((time) => Number.isFinite(time));
  return times.length > 0 ? new Date(Math.max(...times)) : null;
}

/** A booking can be reviewed once it is confirmed/completed and a session has started. */
export function isBookingReviewable(
  booking: ReviewableBooking,
  now = new Date()
): boolean {
  if (booking.status !== "confirmed" && booking.status !== "completed") {
    return false;
  }
  if (booking.status === "completed") return true;
  return booking.sessions.some(
    (session) =>
      session.status !== "cancelled" &&
      new Date(session.date).getTime() <= now.getTime()
  );
}

/** Format a review event date for display (client-safe — no MongoDB imports). */
export function formatReviewEventDate(
  value: Date | string | undefined,
  locale = "en-GB"
): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
