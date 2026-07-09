import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import { styleSchema, type Style } from "@/schemas/styleSchema";

export class StyleModel extends ModelBase<Style> {
  protected collectionName = "styles";
  protected schema: ZodSchema<Style> = styleSchema;

  async getStylesByUserId(user_id: string): Promise<Style[] | null> {
    const result = await this.find({ user_id }, { sort: { order: 1 } });
    return result.length > 0 ? result : null;
  }
}
