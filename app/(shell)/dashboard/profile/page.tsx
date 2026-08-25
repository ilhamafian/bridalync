import { redirect } from "next/navigation";

import {
  ProfileManager,
  type ProfileItem,
} from "@/components/profile/ProfileManager";
import { ReviewsManager } from "@/components/profile/ReviewsManager";
import { reviewModel } from "@/models/Review";
import { toIdString } from "@/schemas/objectId";
import { toDashboardReview } from "@/schemas/reviewSchema";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { getSessionUser } from "@/utils/auth/session";
import {
  buildProfileDisplayUrl,
  buildProfileUrl,
  getAppUrl,
} from "@/utils/appUrl";

export default async function ProfilePage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth");
  }

  if (!isOnboardingComplete(user.onboarding)) {
    redirect("/onboarding");
  }

  const userId = toIdString(user._id);
  const username = user.username ?? "";
  let profileUrl = "";
  let profileDisplayUrl = "";

  try {
    const appUrl = getAppUrl();
    if (username) {
      profileUrl = buildProfileUrl(appUrl, username);
      profileDisplayUrl = buildProfileDisplayUrl(appUrl, username);
    }
  } catch {
    if (username) {
      profileUrl = `/${username}`;
      profileDisplayUrl = username;
    }
  }

  const initialProfile: ProfileItem = {
    _id: userId,
    email: user.email,
    name: user.name ?? "",
    username,
    mobile: user.mobile ?? "",
    country_code: user.country_code ?? "",
    role: user.role ?? null,
    profile_photo_url: user.profile_photo_url ?? "",
    social_links: {
      instagram: user.social_links?.instagram ?? "",
      tiktok: user.social_links?.tiktok ?? "",
    },
    profileUrl,
    profileDisplayUrl,
  };

  const reviewDocs = userId
    ? await reviewModel.findByFreelancerUserId(userId, 100)
    : [];
  const initialReviews = reviewDocs.map(toDashboardReview);

  return (
    <div className="flex flex-col gap-6">
      <ProfileManager initialProfile={initialProfile} />
      <div className="px-4 lg:px-6">
        <ReviewsManager initialReviews={initialReviews} />
      </div>
    </div>
  );
}
