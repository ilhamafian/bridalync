import { ZodSchema } from "zod";
import { ModelBase } from "@/models/ModelBase";
import { userSchema, User } from "@/schemas/userSchema";
import { isOnboardingComplete } from "@/schemas/onboardingSchema";

export class UserModel extends ModelBase<User> {
  protected collectionName = "users";
  protected schema: ZodSchema<User> = userSchema;

  static userRoles: { value: string; label: string }[] = [
    { value: "makeupartist", label: "Makeup Artist" },
    { value: "hijabstylist", label: "Hijab Stylist" },
  ];

  async findByUsername(username: string): Promise<User | null> {
    const result = await this.findOne({ username: username.toLowerCase() });
    return result ? result: null;
  }

  async checkUserOnboarded(username: string): Promise<boolean> {
    const user = await this.findByUsername(username);
    if (!user?._id) {
      return false;
    }
    return isOnboardingComplete(user.onboarding);
  }
}