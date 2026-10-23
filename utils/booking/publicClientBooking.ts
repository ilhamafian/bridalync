import { SettingModel } from "@/models/Setting";
import { toIdString } from "@/schemas/objectId";
import {
  toPublicBooking,
  type PersistedBooking,
  type PublicBooking,
} from "@/schemas/bookingSchema";
import {
  paymentSettingSchema,
  toManualTransferDetails,
} from "@/schemas/settingSchema";
import { getFreelancerByUsername } from "@/utils/users";

function toPublicBookingFreelancer(
  freelancer: NonNullable<Awaited<ReturnType<typeof getFreelancerByUsername>>>
) {
  if (!freelancer.mobile || !freelancer.country_code) {
    return null;
  }

  return {
    name: freelancer.name?.trim() || freelancer.username || "Stylist",
    mobile: freelancer.mobile,
    country_code: freelancer.country_code,
  };
}

/** The same public booking the client page loads, including payment details. */
export async function toClientFacingBooking(
  booking: PersistedBooking
): Promise<PublicBooking> {
  const freelancer = await getFreelancerByUsername(booking.freelancerUsername);
  const freelancerId = freelancer?._id
    ? toIdString(freelancer._id as never)
    : null;
  const settings = freelancerId
    ? await new SettingModel().findSettingsByUserId(freelancerId)
    : null;
  const paymentSettings = paymentSettingSchema.parse(settings?.payment ?? {});

  return toPublicBooking(
    booking,
    freelancer ? toPublicBookingFreelancer(freelancer) : null,
    paymentSettings.method,
    toManualTransferDetails(paymentSettings),
    paymentSettings.balance_due_before,
    settings?.morning_call?.show_price !== false,
    settings?.show_whatsapp_button !== false
  );
}
