import { ObjectId } from "mongodb";
import { ZodSchema } from "zod";

import { ModelBase } from "@/models/ModelBase";
import { bookingSchema, type Booking } from "@/schemas/bookingSchema";

class BookingModel extends ModelBase<Booking> {
  protected collectionName = "bookings";
  protected schema: ZodSchema<Booking> = bookingSchema;
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
