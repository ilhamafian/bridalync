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

  async findByStripeAccountId(stripeAccountId: string): Promise<User | null> {
    const result = await this.findOne({ stripe_account_id: stripeAccountId } as never);
    return result ?? null;
  }

  async checkUserOnboarded(username: string): Promise<boolean> {
    const user = await this.findByUsername(username);
    if (!user?._id) {
      return false;
    }
    return isOnboardingComplete(user.onboarding);
  }

  async setDeferredMinimalAccount(userId: string, stripeAccountId: string) {
    const collection = await this.getCollection();
    return collection.updateOne(this.buildIdFilter(userId), {
      $set: {
        stripe_account_id: stripeAccountId,
        "deferred_onboarding.has_minimal_account": true,
        updated_at: new Date(),
      },
    } as never);
  }

  async recordDeferredEarning(userId: string, amountRm: number) {
    const user = await this.findById(userId);
    if (!user) return null;

    const collection = await this.getCollection();
    const update: Record<string, unknown> = {
      $inc: {
        "deferred_onboarding.pending_earnings": amountRm,
        "deferred_onboarding.earnings_count": 1,
      },
      $set: {
        updated_at: new Date(),
      },
    };

    if (!user.is_stripe_connected) {
      (update.$set as Record<string, unknown>)[
        "deferred_onboarding.onboarding_notifications"
      ] = true;
    }

    return collection.updateOne(this.buildIdFilter(userId), update as never);
  }

  async markStripeConnected(userId: string) {
    const collection = await this.getCollection();
    return collection.updateOne(this.buildIdFilter(userId), {
      $set: {
        is_stripe_connected: true,
        "deferred_onboarding.onboarding_notifications": false,
        updated_at: new Date(),
      },
    } as never);
  }
}