import type { Filter, WithId } from "mongodb";
import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import {
  blockedSlotSchema,
  type BlockedSlot,
} from "@/schemas/blockedSlotSchema";
import type { TimeSlot } from "@/schemas/settingSchema";

export class BlockedSlotModel extends ModelBase<BlockedSlot> {
  protected collectionName = "blocked_slots";
  protected schema: ZodSchema<BlockedSlot> = blockedSlotSchema;

  async ensureIndexes() {
    const collection = await this.getCollection();
    await collection.createIndex(
      { user_id: 1, date: 1, startTime: 1, endTime: 1 },
      { unique: true, name: "blocked_slots_user_date_slot" }
    );
  }

  async findByUserId(
    user_id: string,
    options?: { from?: string }
  ): Promise<WithId<BlockedSlot>[]> {
    const query: Filter<BlockedSlot> = { user_id };
    if (options?.from) {
      query.date = { $gte: options.from };
    }
    return this.find(query, { sort: { date: 1, startTime: 1 } });
  }

  async findByUserIdAndDates(
    user_id: string,
    dates: string[]
  ): Promise<WithId<BlockedSlot>[]> {
    const uniqueDates = [...new Set(dates.filter(Boolean))];
    if (uniqueDates.length === 0) return [];

    return this.find(
      { user_id, date: { $in: uniqueDates } },
      { sort: { date: 1, startTime: 1 } }
    );
  }

  async blockSlot(
    user_id: string,
    date: string,
    slot: TimeSlot
  ): Promise<WithId<BlockedSlot>> {
    const existing = await this.findOne({ user_id, date, ...slot });
    if (existing) return existing;

    return this.create(blockedSlotSchema.parse({ user_id, date, ...slot }));
  }

  async unblockSlot(user_id: string, date: string, slot: TimeSlot) {
    const collection = await this.getCollection();
    await collection.deleteOne({
      user_id,
      date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    } as Filter<BlockedSlot>);
  }
}

export const blockedSlotModel = new BlockedSlotModel();

export function serializeBlockedSlot(doc: WithId<BlockedSlot>) {
  return {
    date: doc.date,
    startTime: doc.startTime,
    endTime: doc.endTime,
    createdAt: doc.created_at ? new Date(doc.created_at).toISOString() : null,
  };
}
