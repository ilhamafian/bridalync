import { NextRequest } from "next/server";
import { z } from "zod";

import { reviewModel } from "@/models/Review";
import { UserModel } from "@/models/User";
import { toIdString } from "@/schemas/objectId";
import { toPublicReview } from "@/schemas/reviewSchema";
import { createResponse, handleError } from "@/utils/apiHelper";

const querySchema = z.object({
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const parsed = querySchema.safeParse({
      offset: request.nextUrl.searchParams.get("offset") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return createResponse({ error: "Invalid pagination" }, 400);
    }

    const user = await new UserModel().findByUsername(username);
    if (!user?._id) {
      return createResponse({ error: "User not found" }, 404);
    }

    const { reviews, hasMore } = await reviewModel.findPageByFreelancerUserId(
      toIdString(user._id),
      parsed.data
    );

    return createResponse({
      reviews: reviews.map(toPublicReview),
      hasMore,
    });
  } catch (error) {
    return handleError(error);
  }
}
