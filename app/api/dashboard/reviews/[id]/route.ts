import { NextRequest } from "next/server";
import { ZodSchema } from "zod";

import { reviewModel } from "@/models/Review";
import {
  reviewSchema,
  updateManualReviewSchema,
  toDashboardReview,
  type Review,
} from "@/schemas/reviewSchema";
import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";

async function getAuthorizedUserId() {
  const user = await getSessionUser();
  if (!user || !isOnboardingComplete(user.onboarding)) {
    return null;
  }
  return toIdString(user._id) || null;
}

async function getOwnedReview(id: string, userId: string) {
  const review = await reviewModel.findById(id);
  if (!review || review.freelancerUserId !== userId) {
    return null;
  }
  return review;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const existing = await getOwnedReview(id, userId);
    if (!existing) {
      return createResponse({ error: "Review not found" }, 404);
    }

    const body = await req.json();
    const parsed = updateManualReviewSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const update: Partial<Review> = {};
    if (parsed.data.clientName !== undefined) {
      update.clientName = parsed.data.clientName.trim();
    }
    if (parsed.data.event_date !== undefined) {
      update.event_date = parsed.data.event_date;
    }
    if (parsed.data.comment !== undefined) {
      update.comment = parsed.data.comment.trim() || undefined;
    }
    if (parsed.data.image_urls !== undefined) {
      update.image_urls = parsed.data.image_urls;
    }

    await reviewModel.update(
      id,
      update,
      reviewSchema.partial() as ZodSchema<Partial<Review>>
    );

    const refreshed = await reviewModel.findById(id);
    if (!refreshed) {
      return createResponse({ error: "Review not found" }, 404);
    }

    return createResponse({ review: toDashboardReview(refreshed) });
  } catch (error) {
    if (error instanceof Error) {
      return createResponse({ error: error.message }, 400);
    }
    return handleError(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const existing = await getOwnedReview(id, userId);
    if (!existing) {
      return createResponse({ error: "Review not found" }, 404);
    }

    await reviewModel.delete(id);
    return createResponse({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
