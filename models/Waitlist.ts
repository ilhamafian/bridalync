import { type WithId } from "mongodb";
import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import {
  waitlistSchema,
  type WaitlistEntry,
  type WaitlistInput,
} from "@/schemas/waitlistSchema";

class WaitlistModel extends ModelBase<WaitlistEntry> {
  protected collectionName = "waitlist";
  protected schema: ZodSchema<WaitlistEntry> = waitlistSchema;

  async findByPhone(
    countryCode: string,
    mobile: string
  ): Promise<WithId<WaitlistEntry> | null> {
    return this.findOne({
      country_code: countryCode,
      mobile,
    } as never);
  }

  async addOrGetExisting(
    input: WaitlistInput
  ): Promise<{ entry: WithId<WaitlistEntry>; created: boolean }> {
    const existing = await this.findByPhone(input.country_code, input.mobile);
    if (existing) {
      return { entry: existing, created: false };
    }

    const entry = await this.create({
      country_code: input.country_code,
      mobile: input.mobile,
    });
    return { entry, created: true };
  }
}

export const waitlistModel = new WaitlistModel();
