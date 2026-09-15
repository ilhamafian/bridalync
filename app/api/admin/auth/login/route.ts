import { NextRequest } from "next/server";
import { z } from "zod";

import { adminLoginSchema } from "@/schemas/adminSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import {
  authenticateAdmin,
  setAdminSession,
} from "@/utils/auth/admin-session";
import {
  AdminEmailVerificationError,
  verifyAdminLoginCode,
} from "@/utils/auth/admin-email-verification";

function readableErrorMessage(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallback;
  }
  if (error instanceof Error && error.message.trim()) {
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
    const parsed = adminLoginSchema.safeParse(body);
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ??
        "Email, password, and code are required.";
      return createResponse({ error: message }, 400);
    }

    const admin = await authenticateAdmin(parsed.data);
    await verifyAdminLoginCode(parsed.data.email, parsed.data.code);
    await setAdminSession(admin);

    return createResponse(
      {
        ok: true,
        email: admin.email,
      },
      200
    );
  } catch (error) {
    if (error instanceof AdminEmailVerificationError) {
      return createResponse({ error: error.message }, 401);
    }

    if (error instanceof Error) {
      return createResponse(
        { error: readableErrorMessage(error, "Could not sign in.") },
        401
      );
    }
    return handleError(error);
  }
}
