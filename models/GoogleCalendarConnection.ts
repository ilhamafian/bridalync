import type { Filter, WithId } from "mongodb";
import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import {
  googleCalendarConnectionSchema,
  type GoogleCalendarConnection,
} from "@/schemas/googleCalendarConnectionSchema";

export class GoogleCalendarConnectionModel extends ModelBase<GoogleCalendarConnection> {
  protected collectionName = "google_calendar_connections";
  protected schema: ZodSchema<GoogleCalendarConnection> =
    googleCalendarConnectionSchema;

  async findByUserId(
    user_id: string
  ): Promise<WithId<GoogleCalendarConnection> | null> {
    return this.findOne({ user_id });
  }

  async upsertForUser(
    user_id: string,
    data: Omit<GoogleCalendarConnection, "user_id" | "created_at" | "updated_at">
  ) {
    const validated = googleCalendarConnectionSchema
      .omit({ created_at: true, updated_at: true })
      .parse({ ...data, user_id });
    const now = new Date();
    const collection = await this.getCollection();
    await collection.updateOne(
      { user_id } as Filter<GoogleCalendarConnection>,
      {
        $set: { ...validated, updated_at: now },
        $setOnInsert: { created_at: now },
      },
      { upsert: true }
    );
  }

  async updateTokens(
    user_id: string,
    data: Pick<
      GoogleCalendarConnection,
      "access_token_enc" | "access_token_expires_at"
    > & { refresh_token_enc?: string }
  ) {
    const collection = await this.getCollection();
    await collection.updateOne({ user_id } as Filter<GoogleCalendarConnection>, {
      $set: { ...data, updated_at: new Date() },
    });
  }

  async deleteByUserId(user_id: string) {
    const collection = await this.getCollection();
    await collection.deleteOne({ user_id } as Filter<GoogleCalendarConnection>);
  }
}

export const googleCalendarConnectionModel = new GoogleCalendarConnectionModel();
