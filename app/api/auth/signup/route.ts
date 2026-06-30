import { NextRequest } from "next/server";

import {
  AuthError,
  createFreelancerAccount,
} from "@/lib/auth/freelancer-auth";
import { signupRequestSchema } from "@/lib/schemas/auth";
import { createResponse, handleError } from "@/utils/apiHelper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupRequestSchema.safeParse(body);

    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const freelancer = await createFreelancerAccount(parsed.data);

    return createResponse({ freelancer }, 201);
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === "EMAIL_TAKEN" ? 409 : 401;
      return createResponse({ error: error.message }, status);
    }

    return handleError(error);
  }
}
