import { put } from "@vercel/blob";
import { NextRequest } from "next/server";

import { toIdString } from "@/schemas/objectId";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";
import {
  prepareFileForUpload,
  UPLOAD_IMAGE_ALLOWED_TYPES,
} from "@/utils/image/upload";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !isOnboardingComplete(user.onboarding)) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const userId = toIdString(user._id);
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const folder = formData.get("folder");

    if (!(file instanceof File)) {
      return createResponse({ error: "No file provided." }, 400);
    }

    if (!UPLOAD_IMAGE_ALLOWED_TYPES.has(file.type)) {
      return createResponse(
        { error: "Upload a JPEG, PNG, WebP, or GIF image." },
        400
      );
    }

    const prepared = await prepareFileForUpload(file);

    const uploadFolder =
      typeof folder === "string" && folder.trim().length > 0
        ? folder.trim()
        : "catalog-images";

    const blob = await put(
      `${uploadFolder}/${userId}/${prepared.fileName}`,
      prepared.data,
      {
        access: "public",
        addRandomSuffix: true,
        contentType: prepared.contentType,
      }
    );

    return createResponse({ url: blob.url }, 200);
  } catch (error) {
    return handleError(error);
  }
}
