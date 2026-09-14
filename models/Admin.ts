import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import { adminSchema, type Admin } from "@/schemas/adminSchema";

export class AdminModel extends ModelBase<Admin> {
  protected collectionName = "admins";
  protected schema: ZodSchema<Admin> = adminSchema;

  async findByEmail(email: string): Promise<Admin | null> {
    const result = await this.findOne({
      email: email.trim().toLowerCase(),
    } as never);
    return result ?? null;
  }
}

export const adminModel = new AdminModel();
