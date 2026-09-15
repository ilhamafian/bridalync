import { NextRequest } from "next/server";
import type { WithId } from "mongodb";

import { blockedDateModel } from "@/models/BlockedDate";
import {
  blockedDateKeySchema,
  blockedDatesPutSchema,
  type BlockedDate,
} from "@/schemas/blockedDateSchema";
import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";

function serializeBlockedDate(doc: WithId<BlockedDate>) {
  return {
    _id: toIdString(doc._id),
    date: doc.date,
  };
}

async function getAuthorizedUserId() {
  const user = await getSessionUser();
  if (!user || !isOnboardingComplete(user.onboarding)) {
    return null;
  }
  return toIdString(user._id) || null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    await blockedDateModel.ensureIndexes().catch(() => {
      // Index may already exist
    });

    const fromParam = req.nextUrl.searchParams.get("from") ?? undefined;
    const toParam = req.nextUrl.searchParams.get("to") ?? undefined;

    if (fromParam && !blockedDateKeySchema.safeParse(fromParam).success) {
      return createResponse({ error: "Invalid from date" }, 400);
    }
    if (toParam && !blockedDateKeySchema.safeParse(toParam).success) {
      return createResponse({ error: "Invalid to date" }, 400);
    }

    const blockedDates = await blockedDateModel.findByUserId(userId, {
      from: fromParam,
      to: toParam,
    });

    return createResponse({
      blocked_dates: blockedDates.map(serializeBlockedDate),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    await blockedDateModel.ensureIndexes().catch(() => {
      // Index may already exist
    });

    const body = await req.json();
    const parsed = blockedDatesPutSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const { date, blocked } = parsed.data;

    if (blocked) {
      await blockedDateModel.blockDate(userId, date);
    } else {
      await blockedDateModel.unblockDate(userId, date);
    }

    const blockedDates = await blockedDateModel.findByUserIdAndDates(userId, [
      date,
    ]);

    return createResponse({
      date,
      blocked,
      blocked_dates: blockedDates.map(serializeBlockedDate),
    });
  } catch (error) {
    return handleError(error);
  }
}
