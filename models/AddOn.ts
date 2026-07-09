import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import { addOnSchema, type AddOn } from "@/schemas/addOnSchema";

export class AddOnModel extends ModelBase<AddOn> {
  protected collectionName = "add_ons";
  protected schema: ZodSchema<AddOn> = addOnSchema;

  async getAddOnsByUserId(user_id: string): Promise<AddOn[] | null> {
    const result = await this.find({ user_id }, { sort: { order: 1 } });
    return result.length > 0 ? result : null;
  }
}
