import { NextRequest } from "next/server";

import { sendVerificationCodeRequestSchema } from "@/schemas/auth";
import {
  EmailVerificationError,
  sendVerificationCode,
} from "@/utils/auth/email-verification";
import { createResponse, handleError } from "@/utils/apiHelper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = sendVerificationCodeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    await sendVerificationCode(parsed.data.email);

    return createResponse({ success: true });
  } catch (error) {
    if (error instanceof EmailVerificationError) {
      const status = error.code === "EMAIL_TAKEN" ? 409 : 400;
      return createResponse({ error: error.message }, status);
    }

    return handleError(error);
  }
}
