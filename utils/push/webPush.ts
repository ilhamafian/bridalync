import webpush, { type PushSubscription as WebPushSubscription } from "web-push";

import { pushSubscriptionModel } from "@/models/PushSubscription";
import type { PushSubscriptionRecord } from "@/schemas/pushSubscriptionSchema";

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:hello@bridalync.app";

  if (!publicKey || !privateKey) {
    throw new Error(
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set"
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
};

function toWebPushSubscription(
  record: PushSubscriptionRecord
): WebPushSubscription {
  return {
    endpoint: record.endpoint,
    keys: {
      p256dh: record.keys.p256dh,
      auth: record.keys.auth,
    },
  };
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  try {
    ensureVapidConfigured();
  } catch (error) {
    console.error("Push not configured:", error);
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await pushSubscriptionModel.findByUserId(userId);
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard/bookings",
    icon: payload.icon ?? "/icon-192.png",
    badge: payload.badge ?? "/icon-192.png",
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          toWebPushSubscription(subscription),
          body
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          typeof (error as { statusCode?: unknown }).statusCode === "number"
            ? (error as { statusCode: number }).statusCode
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await pushSubscriptionModel.deleteByEndpointOnly(subscription.endpoint);
        } else {
          console.error("Failed to send push notification:", error);
        }
      }
    })
  );

  return { sent, failed };
}
