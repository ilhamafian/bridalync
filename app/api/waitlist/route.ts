import { NextRequest } from "next/server";

import { waitlistModel } from "@/models/Waitlist";
import { waitlistInputSchema } from "@/schemas/waitlistSchema";
import { createResponse, handleError } from "@/utils/apiHelper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = waitlistInputSchema.safeParse(body);

    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const { created } = await waitlistModel.addOrGetExisting(parsed.data);

    return createResponse(
      {
        success: true,
        created,
        message: created
          ? "You're on the waitlist. We'll be in touch soon."
          : "You're already on the waitlist. We'll be in touch soon.",
      },
      created ? 201 : 200
    );
  } catch (error) {
    return handleError(error);
  }
}
