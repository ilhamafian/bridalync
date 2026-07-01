import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import { settingSchema, type Setting } from "@/schemas/settingSchema";
import { z } from "zod";

export const storedSettingSchema = settingSchema.extend({
  user_id: z.string().min(1),
});

export type StoredSetting = z.infer<typeof storedSettingSchema>;

export class SettingModel extends ModelBase<StoredSetting> {
  protected collectionName = "settings";
  protected schema: ZodSchema<StoredSetting> = storedSettingSchema;
}
