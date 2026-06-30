import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import {
  emailVerificationSchema,
  type EmailVerification,
} from "@/schemas/emailVerificationSchema";

class EmailVerificationModel extends ModelBase<EmailVerification> {
  protected collectionName = "email_verifications";
  protected schema: ZodSchema<EmailVerification> = emailVerificationSchema;

  async deleteByEmail(email: string) {
    const collection = await this.getCollection();
    await collection.deleteMany({ email } as never);
  }
}

export const emailVerificationModel = new EmailVerificationModel();
