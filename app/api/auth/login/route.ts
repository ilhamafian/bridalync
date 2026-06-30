import { NextRequest } from "next/server";

import { authenticateFreelancer, AuthError } from "@/utils/auth/freelancer-auth";
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

    const freelancer = await authenticateFreelancer(parsed.data);
    await setAuthSession(freelancer);

    return createResponse(
      {
        freelancer,
        redirectTo: freelancer.onboarding_completed ? "/" : "/onboarding",
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
