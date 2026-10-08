import { ObjectId } from "mongodb";
import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import { bookingSchema, type Booking } from "@/schemas/bookingSchema";
import type { RegionId } from "@/schemas/settingSchema";

class BookingModel extends ModelBase<Booking> {
  protected collectionName = "bookings";
  protected schema: ZodSchema<Booking> = bookingSchema;

  /** Sets `region` on the sessions at the given indexes without rewriting the rest of each session. */
  async setSessionRegions(id: string, regionsByIndex: Map<number, RegionId | null>) {
    if (regionsByIndex.size === 0) return;
    const set: Record<string, RegionId | null> = {};
    for (const [index, region] of regionsByIndex) {
      set[`sessions.${index}.region`] = region;
    }
    const collection = await this.getCollection();
    await collection.updateOne({ _id: new ObjectId(id) }, { $set: set });
  }
}

export const bookingModel = new BookingModel();

export type CreateBookingInput = Omit<Booking, "_id" | "source"> & {
  source?: Booking["source"];
};

export async function createBooking(data: CreateBookingInput) {
  return bookingModel.create({
    _id: new ObjectId(),
    source: "bridalync",
    ...data,
  } as Booking);
}
