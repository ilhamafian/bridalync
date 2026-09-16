import { NextRequest } from "next/server";
import type { WithId } from "mongodb";

import { hotDateModel } from "@/models/HotDate";
import {
  hotDateKeySchema,
  hotDatesPutSchema,
  type HotDate,
} from "@/schemas/hotDateSchema";
import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";

function serializeHotDate(doc: WithId<HotDate>) {
  return {
    _id: toIdString(doc._id),
    date: doc.date,
    package_id: doc.package_id,
    style_id: doc.style_id,
    variant_order: doc.variant_order,
    price: doc.price,
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

    await hotDateModel.ensureIndexes().catch(() => {
      // Index may already exist
    });

    const fromParam = req.nextUrl.searchParams.get("from") ?? undefined;
    const toParam = req.nextUrl.searchParams.get("to") ?? undefined;

    if (fromParam && !hotDateKeySchema.safeParse(fromParam).success) {
      return createResponse({ error: "Invalid from date" }, 400);
    }
    if (toParam && !hotDateKeySchema.safeParse(toParam).success) {
      return createResponse({ error: "Invalid to date" }, 400);
    }

    const hotDates = await hotDateModel.findByUserId(userId, {
      from: fromParam,
      to: toParam,
    });

    return createResponse({
      hot_dates: hotDates.map(serializeHotDate),
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

    await hotDateModel.ensureIndexes().catch(() => {
      // Index may already exist
    });

    const body = await req.json();
    const parsed = hotDatesPutSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const { date, dates, overrides } = parsed.data;
    const dateKeys = [...new Set([...(dates ?? []), ...(date ? [date] : [])])];

    for (const dateKey of dateKeys) {
      for (const override of overrides) {
        if (override.price === null) {
          await hotDateModel.deleteOverride(userId, dateKey, override);
          continue;
        }

        await hotDateModel.upsertOverride(userId, dateKey, {
          ...override,
          price: override.price,
        });
      }
    }

    const hotDates = await hotDateModel.findByUserIdAndDates(userId, dateKeys);

    return createResponse({
      dates: dateKeys,
      hot_dates: hotDates.map(serializeHotDate),
    });
  } catch (error) {
    return handleError(error);
  }
}
