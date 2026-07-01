import { put } from "@vercel/blob";
import { NextRequest } from "next/server";

import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_LOGO_SIZE_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || isOnboardingComplete(user.onboarding)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const userId = toIdString(user._id);
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return createResponse({ error: "No file provided." }, 400);
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return createResponse(
        { error: "Upload a JPEG, PNG, WebP, or GIF image." },
        400
      );
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      return createResponse({ error: "Image must be 4 MB or smaller." }, 400);
    }

    const blob = await put(`company-logos/${userId}/${file.name}`, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return createResponse({ url: blob.url }, 200);
  } catch (error) {
    return handleError(error);
  }
}
