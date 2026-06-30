import { ObjectId } from "mongodb";
import { ZodSchema } from "zod";

import { ModelBase } from "@/lib/models/ModelBase";
import { bookingRecordSchema, type BookingRecord } from "@/lib/schemas/booking-record";

class BookingModel extends ModelBase<BookingRecord> {
  protected collectionName = "bookings";
  protected schema: ZodSchema<BookingRecord> = bookingRecordSchema;
}

export const bookingModel = new BookingModel();

export type CreateBookingInput = Omit<BookingRecord, "_id" | "createdAt">;

export async function createBooking(data: CreateBookingInput) {
  return bookingModel.create({
    _id: new ObjectId(),
    ...data,
    createdAt: new Date(),
  } as BookingRecord);
}
