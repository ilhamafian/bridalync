import { type WithId } from "mongodb";
import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import {
  betaAllowlistSchema,
  type BetaAllowlistEntry,
} from "@/schemas/betaAllowlistSchema";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

class BetaAllowlistModel extends ModelBase<BetaAllowlistEntry> {
  protected collectionName = "beta_allowlist";
  protected schema: ZodSchema<BetaAllowlistEntry> = betaAllowlistSchema;

  async findByEmail(email: string): Promise<WithId<BetaAllowlistEntry> | null> {
    return this.findOne({ email: normalizeEmail(email) } as never);
  }

  async isEmailAllowed(email: string): Promise<boolean> {
    const entry = await this.findByEmail(email);
    return entry !== null;
  }
}

export const betaAllowlistModel = new BetaAllowlistModel();
