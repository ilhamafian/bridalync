import { NextRequest } from "next/server";

import { adminLoginCredentialsSchema } from "@/schemas/adminSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { authenticateAdmin } from "@/utils/auth/admin-session";
import {
  AdminEmailVerificationError,
  sendAdminLoginCode,
} from "@/utils/auth/admin-email-verification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = adminLoginCredentialsSchema.safeParse(body);
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Email and password are required.";
      return createResponse({ error: message }, 400);
    }

    await authenticateAdmin(parsed.data);
    await sendAdminLoginCode(parsed.data.email);

    return createResponse({ ok: true }, 200);
  } catch (error) {
    if (error instanceof AdminEmailVerificationError) {
      const status = error.code === "EMAIL_SEND_FAILED" ? 502 : 400;
      return createResponse({ error: error.message }, status);
    }

    if (error instanceof Error) {
      return createResponse({ error: error.message }, 401);
    }

    return handleError(error);
  }
}
