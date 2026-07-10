import { NextRequest } from "next/server";
import { WithId } from "mongodb";

import { SettingModel } from "@/models/Setting";
import { toIdString } from "@/schemas/objectId";
import {
  settingUpdateSchema,
  type Setting,
  type SettingUpdate,
} from "@/schemas/settingSchema";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import { getSessionUser } from "@/utils/auth/session";

function serializeSetting(setting: WithId<Setting>) {
  return {
    _id: toIdString(setting._id),
    user_id: setting.user_id,
    charge_by: setting.charge_by,
    travel: setting.travel,
    payment: setting.payment,
    invoice: setting.invoice,
    time_slots: setting.time_slots,
    created_at: setting.created_at,
    updated_at: setting.updated_at,
  };
}

function mergeSettingsUpdate(
  existing: WithId<Setting>,
  patch: SettingUpdate
): Partial<Setting> {
  const update: Partial<Setting> = {};

  if (patch.charge_by !== undefined) {
    update.charge_by = patch.charge_by;
  }

  if (patch.travel !== undefined) {
    update.travel = {
      ...existing.travel,
      ...patch.travel,
      location: patch.travel.location ?? existing.travel.location,
    };
  }

  if (patch.payment !== undefined) {
    update.payment = {
      ...existing.payment,
      ...patch.payment,
    };
  }

  if (patch.invoice !== undefined) {
    update.invoice = {
      ...existing.invoice,
      ...patch.invoice,
    };
  }

  if (patch.time_slots !== undefined) {
    update.time_slots = patch.time_slots;
  }

  return update;
}

async function getAuthorizedUserId() {
  const user = await getSessionUser();
  if (!user || !isOnboardingComplete(user.onboarding)) {
    return null;
  }
  return toIdString(user._id) || null;
}

export async function GET() {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const setting = await new SettingModel().findSettingsByUserId(userId);
    if (!setting) {
      return createResponse({ error: "Settings not found" }, 404);
    }

    return createResponse({ setting: serializeSetting(setting) });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getAuthorizedUserId();
    if (!userId) {
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const parsed = settingUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    if (Object.keys(parsed.data).length === 0) {
      return createResponse({ error: "No settings to update." }, 400);
    }

    const model = new SettingModel();
    const existing = await model.findSettingsByUserId(userId);
    if (!existing) {
      return createResponse({ error: "Settings not found" }, 404);
    }

    const update = mergeSettingsUpdate(existing, parsed.data);
    await model.updateSettingsByUserId(userId, update);

    const updated = await model.findSettingsByUserId(userId);
    if (!updated) {
      return createResponse({ error: "Settings not found" }, 404);
    }

    return createResponse({ setting: serializeSetting(updated) });
  } catch (error) {
    if (error instanceof Error) {
      return createResponse({ error: error.message }, 400);
    }
    return handleError(error);
  }
}
