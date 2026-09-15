import { NextRequest } from "next/server";
import { z } from "zod";

import { adminLoginCredentialsSchema } from "@/schemas/adminSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { authenticateAdmin } from "@/utils/auth/admin-session";
import {
  AdminEmailVerificationError,
  sendAdminLoginCode,
} from "@/utils/auth/admin-email-verification";

function readableErrorMessage(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallback;
  }
  if (error instanceof Error && error.message.trim()) {
    // ZodError.message in Zod 4 is a JSON dump of issues.
    if (error.message.trimStart().startsWith("[")) {
      try {
        const issues = JSON.parse(error.message) as Array<{ message?: string }>;
        const message = issues[0]?.message;
        if (typeof message === "string" && message.trim()) {
          return message;
        }
      } catch {
        // fall through
      }
    }
    return error.message;
  }
  return fallback;
}

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
      return createResponse(
        { error: readableErrorMessage(error, "Could not send login code.") },
        401
      );
    }

    return handleError(error);
  }
}
