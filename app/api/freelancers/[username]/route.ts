import { NextRequest } from "next/server";
import { getFreelancerByUsername } from "@/utils/users";
import { createResponse, handleError } from "@/utils/apiHelper";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    const freelancer = await getFreelancerByUsername(username);

    if (!freelancer) {
      return createResponse({ error: "Freelancer not found" }, 404);
    }

    return createResponse(freelancer);
  } catch (error) {
    return handleError(error);
  }
}
