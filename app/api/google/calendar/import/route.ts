import { NextRequest } from "next/server";
import { z } from "zod";

import { isOnboardingComplete } from "@/schemas/userSchema";
import { toIdString } from "@/schemas/objectId";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import { getGoogleCalendarAccessToken } from "@/utils/google/oauth";
import {
  importGoogleCalendarEvents,
  previewGoogleCalendarEvents,
} from "@/utils/google/importCalendarEvents";

const importRequestSchema = z.object({
  eventIds: z.array(z.string().min(1)).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !isOnboardingComplete(user.onboarding)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const username = user.username?.trim().toLowerCase();
    const userId = toIdString(user._id);
    if (!username || !userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const accessToken = await getGoogleCalendarAccessToken(userId);
    if (!accessToken) {
      return createResponse({ error: "Google Calendar is not connected." }, 401);
    }

    const parsed = importRequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const selectedIds = new Set(parsed.data.eventIds);
    const { events } = await previewGoogleCalendarEvents({
      accessToken,
      freelancerUserId: userId,
    });
    const selected = events.filter(
      (event) =>
        selectedIds.has(event.id) && !event.alreadyImported && !event.conflict
    );

    if (selected.length === 0) {
      return createResponse({
        imported: [],
        skippedExisting: parsed.data.eventIds.length,
        skippedConflict: 0,
      });
    }

    const result = await importGoogleCalendarEvents({
      freelancerUserId: userId,
      freelancerUsername: username,
      events: selected,
    });

    return createResponse(result, 201);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "GOOGLE_CALENDAR_UNAUTHORIZED"
    ) {
      return createResponse(
        { error: "Google Calendar access expired. Connect again." },
        401
      );
    }
    return handleError(error);
  }
}
