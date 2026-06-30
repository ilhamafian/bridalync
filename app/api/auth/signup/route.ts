import { NextRequest } from "next/server";

import {
  AuthError,
  createPartialAccount,
} from "@/utils/auth/user-auth";
import { setAuthSession } from "@/utils/auth/session";
import { signupRequestSchema } from "@/schemas/auth";
import { createResponse, handleError } from "@/utils/apiHelper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupRequestSchema.safeParse(body);

    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const freelancer = await createPartialAccount(parsed.data);
    await setAuthSession(freelancer);

    return createResponse(
      { freelancer, redirectTo: "/onboarding" },
      201
    );
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === "EMAIL_TAKEN" ? 409 : 401;
      return createResponse({ error: error.message }, status);
    }

    return handleError(error);
  }
}
