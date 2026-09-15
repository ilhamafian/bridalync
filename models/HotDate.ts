import type { Filter, WithId } from "mongodb";
import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import {
  hotDateSchema,
  type HotDate,
  type HotDateOverrideInput,
} from "@/schemas/hotDateSchema";

export class HotDateModel extends ModelBase<HotDate> {
  protected collectionName = "hot_dates";
  protected schema: ZodSchema<HotDate> = hotDateSchema;

  async ensureIndexes() {
    const collection = await this.getCollection();
    await collection.createIndex(
      { user_id: 1, date: 1, package_id: 1 },
      {
        unique: true,
        partialFilterExpression: { package_id: { $type: "string" } },
        name: "hot_dates_user_date_package",
      }
    );
    await collection.createIndex(
      { user_id: 1, date: 1, style_id: 1, variant_order: 1 },
      {
        unique: true,
        partialFilterExpression: {
          style_id: { $type: "string" },
          variant_order: { $type: "number" },
        },
        name: "hot_dates_user_date_style_variant",
      }
    );
    await collection.createIndex(
      { user_id: 1, date: 1 },
      { name: "hot_dates_user_date" }
    );
  }

  async findByUserId(
    user_id: string,
    options?: { from?: string; to?: string }
  ): Promise<WithId<HotDate>[]> {
    const query: Filter<HotDate> = { user_id };
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
  ): Promise<WithId<HotDate>[]> {
    const uniqueDates = [...new Set(dates.filter(Boolean))];
    if (uniqueDates.length === 0) return [];

    return this.find(
      { user_id, date: { $in: uniqueDates } },
      { sort: { date: 1 } }
    );
  }

  async deleteOverride(
    user_id: string,
    date: string,
    override: Pick<
      HotDateOverrideInput,
      "package_id" | "style_id" | "variant_order"
    >
  ): Promise<void> {
    const collection = await this.getCollection();
    if (override.package_id) {
      await collection.deleteOne({
        user_id,
        date,
        package_id: override.package_id,
      } as Filter<HotDate>);
      return;
    }

    await collection.deleteOne({
      user_id,
      date,
      style_id: override.style_id,
      variant_order: override.variant_order,
    } as Filter<HotDate>);
  }

  async upsertOverride(
    user_id: string,
    date: string,
    override: HotDateOverrideInput & { price: number }
  ): Promise<WithId<HotDate>> {
    const collection = await this.getCollection();
    const now = new Date();

    if (override.package_id) {
      const filter = {
        user_id,
        date,
        package_id: override.package_id,
      } as Filter<HotDate>;
      const existing = await collection.findOne(filter);
      if (existing) {
        await collection.updateOne(filter, {
          $set: { price: override.price, updated_at: now },
        });
        return {
          ...existing,
          price: override.price,
          updated_at: now,
        } as WithId<HotDate>;
      }

      return this.create(
        hotDateSchema.parse({
          user_id,
          date,
          package_id: override.package_id,
          price: override.price,
        })
      );
    }

    const filter = {
      user_id,
      date,
      style_id: override.style_id,
      variant_order: override.variant_order,
    } as Filter<HotDate>;
    const existing = await collection.findOne(filter);
    if (existing) {
      await collection.updateOne(filter, {
        $set: { price: override.price, updated_at: now },
      });
      return {
        ...existing,
        price: override.price,
        updated_at: now,
      } as WithId<HotDate>;
    }

    return this.create(
      hotDateSchema.parse({
        user_id,
        date,
        style_id: override.style_id,
        variant_order: override.variant_order,
        price: override.price,
      })
    );
  }
}

export const hotDateModel = new HotDateModel();
