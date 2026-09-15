import type { Filter, WithId } from "mongodb";
import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import {
  blockedDateSchema,
  type BlockedDate,
} from "@/schemas/blockedDateSchema";

export class BlockedDateModel extends ModelBase<BlockedDate> {
  protected collectionName = "blocked_dates";
  protected schema: ZodSchema<BlockedDate> = blockedDateSchema;

  async ensureIndexes() {
    const collection = await this.getCollection();
    await collection.createIndex(
      { user_id: 1, date: 1 },
      { unique: true, name: "blocked_dates_user_date" }
    );
  }

  async findByUserId(
    user_id: string,
    options?: { from?: string; to?: string }
  ): Promise<WithId<BlockedDate>[]> {
    const query: Filter<BlockedDate> = { user_id };
    if (options?.from || options?.to) {
      query.date = {};
      if (options.from) {
        (query.date as Record<string, string>).$gte = options.from;
      }
      if (options.to) {
        (query.date as Record<string, string>).$lte = options.to;
      }
    }

    return this.find(query, { sort: { date: 1 } });
  }

  async findByUserIdAndDates(
    user_id: string,
    dates: string[]
  ): Promise<WithId<BlockedDate>[]> {
    const uniqueDates = [...new Set(dates.filter(Boolean))];
    if (uniqueDates.length === 0) return [];

    return this.find(
      { user_id, date: { $in: uniqueDates } },
      { sort: { date: 1 } }
    );
  }

  async blockDate(user_id: string, date: string): Promise<WithId<BlockedDate>> {
    const existing = await this.findOne({ user_id, date });
    if (existing) {
      return existing;
    }

    return this.create(
      blockedDateSchema.parse({
        user_id,
        date,
      })
    );
  }

  async unblockDate(user_id: string, date: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.deleteOne({ user_id, date } as Filter<BlockedDate>);
  }
}

export const blockedDateModel = new BlockedDateModel();
