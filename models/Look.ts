import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import { lookSchema, type Look } from "@/schemas/lookSchema";

export class LookModel extends ModelBase<Look> {
  protected collectionName = "looks";
  protected schema: ZodSchema<Look> = lookSchema;
}
