import { NextRequest } from "next/server";

import { pushSubscriptionModel } from "@/models/PushSubscription";
import { pushSubscriptionInputSchema } from "@/schemas/pushSubscriptionSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user?._id) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const parsed = pushSubscriptionInputSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return createResponse(
        { error: "Push notifications are not configured on the server." },
        503
      );
    }

    await pushSubscriptionModel.upsertForUser(
      String(user._id),
      parsed.data,
      req.headers.get("user-agent") ?? undefined
    );

    return createResponse({ success: true });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user?._id) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const endpoint =
      typeof body?.endpoint === "string" ? body.endpoint : null;

    if (!endpoint) {
      return createResponse({ error: "endpoint is required" }, 400);
    }

    await pushSubscriptionModel.deleteByEndpoint(String(user._id), endpoint);
    return createResponse({ success: true });
  } catch (error) {
    return handleError(error);
  }
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?._id) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const subscriptions = await pushSubscriptionModel.findByUserId(
      String(user._id)
    );

    return createResponse({
      subscribed: subscriptions.length > 0,
      count: subscriptions.length,
    });
  } catch (error) {
    return handleError(error);
  }
}
