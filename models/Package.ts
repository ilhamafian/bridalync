import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import { packageSchema, type Package } from "@/schemas/packageSchema";
import { UserModel } from "@/models/User";

export class PackageModel extends ModelBase<Package> {
  protected collectionName = "packages";
  protected schema: ZodSchema<Package> = packageSchema;

  async getPackagesByUsername(username: string): Promise<Package[] | null> {
    const user = await new UserModel().findByUsername(username);
    if (!user?._id) {
      return null;
    }
    const result = await this.find({ user_id: user._id.toString() });
    return result;
  }
  async getPackagesByUserId(user_id: string): Promise<Package[] | null> {
    const result = await this.find({ user_id });
    return result ? result: null;
  }
}
