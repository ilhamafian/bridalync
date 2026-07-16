import { NextRequest } from "next/server";

import { resetPasswordRequestSchema } from "@/schemas/auth";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { authenticateUser } from "@/utils/auth/user-auth";
import {
  PasswordResetError,
  resetPasswordWithCode,
} from "@/utils/auth/password-reset";
import { setAuthSession } from "@/utils/auth/session";
import { createResponse, handleError } from "@/utils/apiHelper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = resetPasswordRequestSchema.safeParse(body);

    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    await resetPasswordWithCode(parsed.data);
    const freelancer = await authenticateUser({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    await setAuthSession(freelancer);

    return createResponse(
      {
        freelancer,
        redirectTo: isOnboardingComplete(freelancer.onboarding)
          ? "/dashboard"
          : "/onboarding",
      },
      200
    );
  } catch (error) {
    if (error instanceof PasswordResetError) {
      return createResponse({ error: error.message }, 400);
    }

    return handleError(error);
  }
}
