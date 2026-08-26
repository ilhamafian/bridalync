import { z } from "zod";

import { objectIdSchema } from "./objectId";

const reviewImageUrlSchema = z.string().trim().min(1).max(2000);

export const reviewSchema = z.object({
  _id: objectIdSchema.optional(),
  freelancerUserId: z.string().min(1),
  /** Legacy field — older booking-sourced reviews may still have this. */
  bookingId: z.string().min(1).optional(),
  source: z.enum(["booking", "manual"]).default("manual"),
  clientName: z.string().min(1).max(120),
  /** When the event / session took place. */
  event_date: z.coerce.date().optional(),
  /** Legacy — ratings are no longer collected. */
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().optional(),
  image_urls: z.array(reviewImageUrlSchema).max(5).default([]),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export type Review = z.infer<typeof reviewSchema>;

export const createManualReviewSchema = z.object({
  clientName: z.string().trim().min(1, "Client name is required").max(120),
  event_date: z.coerce.date(),
  comment: z.string().trim().optional(),
  image_urls: z.array(reviewImageUrlSchema).max(5).default([]),
});

export type CreateManualReview = z.infer<typeof createManualReviewSchema>;

export const updateManualReviewSchema = createManualReviewSchema.partial();

export type UpdateManualReview = z.infer<typeof updateManualReviewSchema>;

export const publicReviewSchema = z.object({
  _id: z.string(),
  clientName: z.string(),
  event_date: z.coerce.date().optional(),
  comment: z.string().optional(),
  image_urls: z.array(z.string()).default([]),
  created_at: z.coerce.date().optional(),
});

export type PublicReview = z.infer<typeof publicReviewSchema>;

export const dashboardReviewSchema = publicReviewSchema;

export type DashboardReview = z.infer<typeof dashboardReviewSchema>;

function reviewId(review: Review): string {
  if (typeof review._id === "string") return review._id;
  if (review._id != null) return String(review._id);
  return "";
}

export function toPublicReview(review: Review): PublicReview {
  return publicReviewSchema.parse({
    _id: reviewId(review),
    clientName: review.clientName,
    event_date: review.event_date,
    comment: review.comment,
    image_urls: review.image_urls ?? [],
    created_at: review.created_at,
  });
}

export function toDashboardReview(review: Review): DashboardReview {
  return toPublicReview(review);
}
