import { NextRequest } from "next/server";

import { blockedSlotModel, serializeBlockedSlot } from "@/models/BlockedSlot";
import { blockedDateKeySchema } from "@/schemas/blockedDateSchema";
import { blockedSlotsPutSchema } from "@/schemas/blockedSlotSchema";
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

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const fromParam = req.nextUrl.searchParams.get("from") ?? undefined;
    if (fromParam && !blockedDateKeySchema.safeParse(fromParam).success) {
      return createResponse({ error: "Invalid from date" }, 400);
    }

    const blockedSlots = await blockedSlotModel.findByUserId(userId, {
      from: fromParam,
    });

    return createResponse({
      blocked_slots: blockedSlots.map(serializeBlockedSlot),
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

    await blockedSlotModel.ensureIndexes().catch(() => {
      // Index may already exist
    });

    const body = await req.json();
    const parsed = blockedSlotsPutSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const { date, slots, blocked } = parsed.data;
    for (const slot of slots) {
      if (blocked) {
        await blockedSlotModel.blockSlot(userId, date, slot);
      } else {
        await blockedSlotModel.unblockSlot(userId, date, slot);
      }
    }

    const blockedSlots = await blockedSlotModel.findByUserIdAndDates(userId, [
      date,
    ]);

    return createResponse({
      date,
      blocked,
      blocked_slots: blockedSlots.map(serializeBlockedSlot),
    });
  } catch (error) {
    return handleError(error);
  }
}
