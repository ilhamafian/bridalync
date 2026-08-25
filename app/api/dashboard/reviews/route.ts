import { NextRequest } from "next/server";

import { createReview, reviewModel } from "@/models/Review";
import {
  createManualReviewSchema,
  toDashboardReview,
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

export async function GET() {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const reviews = await reviewModel.findByFreelancerUserId(userId, 100);
    return createResponse({
      reviews: reviews.map(toDashboardReview),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const parsed = createManualReviewSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const review = await createReview({
      freelancerUserId: userId,
      source: "manual",
      clientName: parsed.data.clientName.trim(),
      event_date: parsed.data.event_date,
      comment: parsed.data.comment?.trim() || undefined,
      image_urls: parsed.data.image_urls ?? [],
    });

    return createResponse({ review: toDashboardReview(review) }, 201);
  } catch (error) {
    if (error instanceof Error) {
      return createResponse({ error: error.message }, 400);
    }
    return handleError(error);
  }
}
