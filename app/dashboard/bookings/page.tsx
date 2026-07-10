import { redirect } from "next/navigation";

import {
  BookingsManager,
  type AddOnCatalogItem,
  type PackageCatalogItem,
  type StyleCatalogItem,
} from "@/components/BookingsManager";
import { AddOnModel } from "@/models/AddOn";
import { bookingModel } from "@/models/Booking";
import { PackageModel } from "@/models/Package";
import { SettingModel } from "@/models/Setting";
import { StyleModel } from "@/models/Style";
import { toIdString } from "@/schemas/objectId";
import {
  getDefaultTimeSlots,
  type TimeSlot,
} from "@/schemas/settingSchema";
import { isOnboardingComplete } from "@/schemas/userSchema";
import { getSessionUser } from "@/utils/auth/session";
import { serializeBooking } from "@/utils/booking/serializeBooking";

export default async function BookingsPage() {
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

  const [bookings, packages, styles, addOns, settings] = await Promise.all([
    bookingModel.find({ freelancerUserId: userId }, { sort: { created_at: -1 } }),
    new PackageModel().find({ user_id: userId }, { sort: { order: 1 } }),
    new StyleModel().find({ user_id: userId }, { sort: { order: 1 } }),
    new AddOnModel().find({ user_id: userId }, { sort: { order: 1 } }),
    new SettingModel().findSettingsByUserId(userId),
  ]);

  const chargeBy = settings?.charge_by ?? "package";
  const timeSlots: TimeSlot[] =
    settings?.time_slots?.length
      ? settings.time_slots
      : getDefaultTimeSlots(chargeBy);

  const packageItems: PackageCatalogItem[] = packages.map((pkg) => ({
    _id: toIdString(pkg._id),
    name: pkg.name,
    price: pkg.price ?? 0,
    deposit: pkg.deposit ?? 0,
    session_templates: pkg.session_templates,
  }));

  const styleItems: StyleCatalogItem[] = styles.map((style) => ({
    _id: toIdString(style._id),
    name: style.name,
    variants: style.variants.map((variant) => ({
      name: variant.name,
      order: variant.order,
      price: variant.price,
      deposit: variant.deposit,
      image_url: variant.image_url,
    })),
  }));

  const addOnItems: AddOnCatalogItem[] = addOns.map((addOn) => ({
    _id: toIdString(addOn._id),
    name: addOn.name,
    price: addOn.price,
  }));

  return (
    <BookingsManager
      initialBookings={bookings.map(serializeBooking)}
      packages={packageItems}
      styles={styleItems}
      addOns={addOnItems}
      chargeBy={chargeBy}
      timeSlots={timeSlots}
    />
  );
}
