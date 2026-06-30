import { NextRequest } from "next/server";

import { authenticateFreelancer, AuthError } from "@/lib/auth/freelancer-auth";
import { loginRequestSchema } from "@/lib/schemas/auth";
import { createResponse, handleError } from "@/utils/apiHelper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginRequestSchema.safeParse(body);

    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const freelancer = await authenticateFreelancer(parsed.data);

    return createResponse({ freelancer }, 200);
  } catch (error) {
    if (error instanceof AuthError) {
      return createResponse({ error: error.message }, 401);
    }

    return handleError(error);
  }
}
