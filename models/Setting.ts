import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import { settingSchema, settingUpdateSchema, type Setting } from "@/schemas/settingSchema";
import { randomString } from "@/utils/utils";
import { toIdString } from "@/schemas/objectId";


export class SettingModel extends ModelBase<Setting> {
  protected collectionName = "settings";
  protected schema = settingSchema;

  async findByUserId(user_id: string) {
    return this.findOne({ user_id } as never);
  }

  async updateByUserId(user_id: string, update: Partial<Setting>) {
    const setting = await this.findByUserId(user_id);
    if (!setting) {
      throw new Error("Settings not found");
    }

    const id = toIdString(setting._id);
    if (!id) {
      throw new Error("Settings not found");
    }

    return this.update(
      id,
      update as Partial<Setting>,
      settingUpdateSchema as ZodSchema<Partial<Setting>>
    );
  }

  async insertSettings(user_id: string, settings: Setting) {
    const setting = await this.findByUserId(user_id);
    if (setting) {
      await this.updateByUserId(user_id, settings);
    } else {
      await this.create({
        user_id,
        role: settings.role,
        link: randomString(7),
        charge_by: settings.charge_by,
        travel: settings.travel,
        payment: settings.payment,
        bank_account: settings.bank_account,
        invoice: settings.invoice,
      });
    }
  }
}
