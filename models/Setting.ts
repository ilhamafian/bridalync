import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import { settingSchema, type Setting } from "@/schemas/settingSchema";
import { z } from "zod";
import { randomString } from "@/utils/utils";


export class SettingModel extends ModelBase<Setting> {
  protected collectionName = "settings";
  protected schema = settingSchema;

  async insertSettings(user_id: string, settings: Setting) {
    const setting = await this.findOne({ user_id });
    if (setting) {
      await this.update(user_id, settings);
    } else {
      await this.create({ 
        user_id,
        role: settings.role,
        link: randomString(7),
        charge_by: settings.charge_by,
        travel: settings.travel,
        payment: settings.payment,
        invoice: settings.invoice,
        bank_account: settings.bank_account,
       });
    }
  }
}
