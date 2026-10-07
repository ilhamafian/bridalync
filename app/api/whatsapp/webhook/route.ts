import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

import { createResponse } from "@/utils/apiHelper";

export async function GET(req: NextRequest) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error("WHATSAPP_VERIFY_TOKEN is not set");
    return createResponse({ error: "Webhook not configured" }, 500);
  }

  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return createResponse({ error: "Verification failed" }, 403);
}

function isValidSignature(body: string, signature: string | null, appSecret: string) {
  if (!signature?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", appSecret).update(body).digest("hex");
  const received = signature.slice("sha256=".length);
  if (received.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  // Optional until the Meta app secret is configured.
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret && !isValidSignature(body, req.headers.get("x-hub-signature-256"), appSecret)) {
    return createResponse({ error: "Invalid signature" }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return createResponse({ error: "Invalid JSON" }, 400);
  }

  console.info("[whatsapp webhook] received", JSON.stringify(payload));

  // Meta retries any non-2xx response, so always acknowledge.
  return createResponse({ received: true }, 200);
}
