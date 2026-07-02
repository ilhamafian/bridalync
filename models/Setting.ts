import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import { settingSchema, settingUpdateSchema, type Setting } from "@/schemas/settingSchema";
import { toIdString } from "@/schemas/objectId";


export class SettingModel extends ModelBase<Setting> {
  protected collectionName = "settings";
  protected schema = settingSchema;

  async findSettingsByUserId(user_id: string) {
    return this.findOne({ user_id } as never);
  }

  async updateSettingsByUserId(user_id: string, update: Partial<Setting>) {
    const setting = await this.findSettingsByUserId(user_id);
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
    const setting = await this.findSettingsByUserId(user_id);
    if (setting) {
      await this.updateSettingsByUserId(user_id, settings);
    } else {
      await this.create({
        user_id,
        charge_by: settings.charge_by,
        travel: settings.travel,
        payment: settings.payment,
        bank_account: settings.bank_account,
        invoice: settings.invoice,
      });
    }
  }
}
