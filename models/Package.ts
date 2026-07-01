import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import { packageSchema, type Package } from "@/schemas/packageSchema";

export class PackageModel extends ModelBase<Package> {
  protected collectionName = "packages";
  protected schema: ZodSchema<Package> = packageSchema;
}
