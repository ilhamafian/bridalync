import { redirect } from "next/navigation";

import {
  ProfileManager,
  type ProfileItem,
} from "@/components/profile/ProfileManager";
import { toIdString } from "@/schemas/objectId";
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
    _id: toIdString(user._id),
    email: user.email,
    name: user.name ?? "",
    username,
    mobile: user.mobile ?? "",
    country_code: user.country_code ?? "",
    role: user.role ?? null,
    profileUrl,
    profileDisplayUrl,
  };

  return <ProfileManager initialProfile={initialProfile} />;
}
