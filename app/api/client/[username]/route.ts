import { NextRequest } from "next/server";

import { UserModel } from "@/models/User";
import { toPublicProfile } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    if (!username) {
      return createResponse({ error: "Username is required" }, 400);
    }
    const user = await new UserModel().findByUsername(username);
    if (!user?._id) {
      return createResponse({ error: "User not found" }, 404);
    }

    return createResponse({ user: toPublicProfile(user) });
  } catch (error) {
    return handleError(error);
  }
}
