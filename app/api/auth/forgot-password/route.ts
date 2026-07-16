import { NextRequest } from "next/server";

import { forgotPasswordRequestSchema } from "@/schemas/auth";
import {
  PasswordResetError,
  sendPasswordResetCode,
} from "@/utils/auth/password-reset";
import { createResponse, handleError } from "@/utils/apiHelper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordRequestSchema.safeParse(body);

    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    await sendPasswordResetCode(parsed.data.email);

    return createResponse({ success: true });
  } catch (error) {
    if (error instanceof PasswordResetError) {
      const status = error.code === "EMAIL_SEND_FAILED" ? 502 : 400;
      return createResponse({ error: error.message }, status);
    }

    return handleError(error);
  }
}
