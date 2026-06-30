import { NextRequest } from "next/server";

import { calculateBookingInvoice } from "@/lib/booking/pricing";
import { createBooking } from "@/lib/models/Booking";
import { freelancerExists } from "@/lib/freelancers";
import { createBookingRequestSchema } from "@/lib/schemas/booking-record";
import { createResponse, handleError } from "@/utils/apiHelper";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createBookingRequestSchema.safeParse(body);

    if (!parsed.success) {
      return createResponse({ error: parsed.error.format() }, 400);
    }

    const data = parsed.data;
    const exists = await freelancerExists(data.freelancerUsername);

    if (!exists) {
      return createResponse({ error: "Freelancer not found" }, 404);
    }

    const { intent, ...bookingData } = data;
    const invoice = calculateBookingInvoice(bookingData.packageId, bookingData.addOns);
    const booking = await createBooking({
      ...bookingData,
      invoice,
      status: intent === "booking" ? "pending" : "enquiry",
    });

    return createResponse(
      {
        id: booking._id.toString(),
        status: booking.status,
        invoice: booking.invoice,
      },
      201
    );
  } catch (error) {
    return handleError(error);
  }
}
