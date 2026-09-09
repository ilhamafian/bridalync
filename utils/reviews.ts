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
