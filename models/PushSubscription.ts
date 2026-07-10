import { ObjectId, type WithId } from "mongodb";
import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import {
  pushSubscriptionSchema,
  type PushSubscriptionInput,
  type PushSubscriptionRecord,
} from "@/schemas/pushSubscriptionSchema";

class PushSubscriptionModel extends ModelBase<PushSubscriptionRecord> {
  protected collectionName = "push_subscriptions";
  protected schema: ZodSchema<PushSubscriptionRecord> = pushSubscriptionSchema;

  async upsertForUser(
    userId: string,
    input: PushSubscriptionInput,
    userAgent?: string
  ): Promise<WithId<PushSubscriptionRecord>> {
    const collection = await this.getCollection();
    const now = new Date();
    const doc: PushSubscriptionRecord = {
      userId,
      endpoint: input.endpoint,
      keys: input.keys,
      expirationTime: input.expirationTime ?? null,
      ...(userAgent ? { userAgent } : {}),
      updated_at: now,
    };

    await collection.updateOne(
      { endpoint: input.endpoint },
      {
        $set: doc,
        $setOnInsert: {
          _id: new ObjectId(),
          created_at: now,
        },
      },
      { upsert: true }
    );

    const saved = await collection.findOne({ endpoint: input.endpoint });
    if (!saved) {
      throw new Error("Failed to save push subscription");
    }
    return saved as WithId<PushSubscriptionRecord>;
  }

  async findByUserId(userId: string): Promise<WithId<PushSubscriptionRecord>[]> {
    return this.find({ userId } as never);
  }

  async deleteByEndpoint(userId: string, endpoint: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.deleteOne({ userId, endpoint } as never);
  }

  async deleteByEndpointOnly(endpoint: string): Promise<void> {
    const collection = await this.getCollection();
    await collection.deleteOne({ endpoint } as never);
  }
}

export const pushSubscriptionModel = new PushSubscriptionModel();
