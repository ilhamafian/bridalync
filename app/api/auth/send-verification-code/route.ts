import { NextRequest } from "next/server";

import { sendVerificationCodeRequestSchema } from "@/schemas/auth";
import {
  EmailVerificationError,
  sendVerificationCode,
} from "@/utils/auth/email-verification";
import {
  BETA_NOT_ALLOWED_CODE,
  BETA_NOT_ALLOWED_MESSAGE,
  SIGNUP_ENABLED,
  isSignupEmailAllowed,
} from "@/utils/auth/signup";
import { createResponse, handleError } from "@/utils/apiHelper";

export async function POST(req: NextRequest) {
  try {
    if (!SIGNUP_ENABLED) {
      return createResponse(
        {
          error:
            "Signup is invite-only during closed beta. Join the waitlist and we'll reach out.",
        },
        403
      );
    }

    const body = await req.json();
    const parsed = sendVerificationCodeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const allowed = await isSignupEmailAllowed(parsed.data.email);
    if (!allowed) {
      return createResponse({
        success: false,
        code: BETA_NOT_ALLOWED_CODE,
        error: BETA_NOT_ALLOWED_MESSAGE,
      });
    }

    await sendVerificationCode(parsed.data.email);

    return createResponse({ success: true });
  } catch (error) {
    if (error instanceof EmailVerificationError) {
      const status =
        error.code === "EMAIL_TAKEN"
          ? 409
          : error.code === "EMAIL_SEND_FAILED"
            ? 502
            : 400;
      return createResponse({ error: error.message }, status);
    }

    return handleError(error);
  }
}
