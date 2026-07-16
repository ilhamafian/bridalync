import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import {
  passwordResetSchema,
  type PasswordReset,
} from "@/schemas/passwordResetSchema";

class PasswordResetModel extends ModelBase<PasswordReset> {
  protected collectionName = "password_resets";
  protected schema: ZodSchema<PasswordReset> = passwordResetSchema;

  async deleteByEmail(email: string) {
    const collection = await this.getCollection();
    await collection.deleteMany({ email } as never);
  }
}

export const passwordResetModel = new PasswordResetModel();
