import { ZodSchema } from "zod";

import { UserModel } from "@/models/User";
import {
  onboardingProgressSchema,
  sessionUserSchema,
  updateUserSchema,
  type UpdateUser,
  type User,
} from "@/schemas/userSchema";
import { setAuthSession } from "@/utils/auth/session";

export async function updateOnboardingProgress(
  userId: string,
  partial: NonNullable<UpdateUser["onboarding"]>
) {
  const userModel = new UserModel();
  const user = await userModel.findById(userId);
  const current = onboardingProgressSchema.parse(user?.onboarding ?? {});
  const merged = onboardingProgressSchema.parse({ ...current, ...partial });

  await userModel.update(
    userId,
    { onboarding: merged } as Partial<User>,
    updateUserSchema as ZodSchema<Partial<User>>
  );
}

export async function refreshSession(userId: string) {
  const updatedUser = await new UserModel().findById(userId);
  if (!updatedUser) {
    return null;
  }

  const parsedUser = sessionUserSchema.safeParse(updatedUser);
  if (!parsedUser.success) {
    return null;
  }

  await setAuthSession(parsedUser.data);
  return parsedUser.data;
}
