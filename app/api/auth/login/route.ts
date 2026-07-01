import { NextRequest } from "next/server";

import { authenticateUser, AuthError } from "@/utils/auth/user-auth";
import { setAuthSession } from "@/utils/auth/session";
import { loginRequestSchema } from "@/schemas/auth";
import { createResponse, handleError } from "@/utils/apiHelper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginRequestSchema.safeParse(body);

    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const freelancer = await authenticateUser(parsed.data);
    await setAuthSession(freelancer);

    return createResponse(
      {
        freelancer,
        redirectTo: freelancer.onboarding_completed ? "/dashboard" : "/onboarding",
      },
      200
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return createResponse({ error: error.message }, 401);
    }

    return handleError(error);
  }
}
