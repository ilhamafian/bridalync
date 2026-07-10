import { redirect } from "next/navigation";

import {
  SettingsManager,
  type SettingsItem,
} from "@/components/SettingsManager";
import { SettingModel } from "@/models/Setting";
import { toIdString } from "@/schemas/objectId";
import {
  getDefaultTimeSlots,
  paymentSettingSchema,
  invoiceSettingSchema,
} from "@/schemas/settingSchema";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { getSessionUser } from "@/utils/auth/session";

export default async function SettingsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth");
  }

  if (!isOnboardingComplete(user.onboarding)) {
    redirect("/onboarding");
  }

  const userId = toIdString(user._id);
  if (!userId) {
    redirect("/auth");
  }

  const setting = await new SettingModel().findSettingsByUserId(userId);
  if (!setting) {
    redirect("/onboarding");
  }

  const payment = paymentSettingSchema.parse(setting.payment ?? {});
  const invoice = invoiceSettingSchema.parse(setting.invoice ?? {});
  const timeSlots =
    setting.time_slots?.length > 0
      ? setting.time_slots
      : getDefaultTimeSlots(setting.charge_by);

  const initialSettings: SettingsItem = {
    _id: toIdString(setting._id),
    charge_by: setting.charge_by,
    travel: setting.travel,
    payment,
    invoice: {
      company_name: invoice.company_name,
      company_registration_number: invoice.company_registration_number,
      company_logo: invoice.company_logo,
      terms_and_conditions: invoice.terms_and_conditions,
    },
    time_slots: timeSlots,
  };

  return (
    <SettingsManager
      initialSettings={initialSettings}
      isStripeConnected={Boolean(user.is_stripe_connected)}
      hasStripeAccount={Boolean(user.stripe_account_id)}
    />
  );
}
