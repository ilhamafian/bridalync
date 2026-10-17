import { NextRequest } from "next/server";
import { z } from "zod";

import { bookingModel } from "@/models/Booking";
import { SettingModel } from "@/models/Setting";
import {
  bookingContactSchema,
  bookingSchema,
  partyMemberInputSchema,
  type Booking,
} from "@/schemas/bookingSchema";
import { MAX_MOODBOARD_IMAGES } from "@/schemas/clientInfoSchema";
import { createResponse, handleError } from "@/utils/apiHelper";
import {
  bookingMatchesClient,
  isBookingMoodboardUrl,
  isClientEditable,
} from "@/utils/booking/clientEdits";
import {
  getBookingParty,
  getBookingPax,
  resolveBookingParty,
} from "@/utils/booking/clientInfo";
import { toClientFacingBooking } from "@/utils/booking/publicClientBooking";
import { getBookingById } from "@/utils/bookings";
import { scheduleBookingCalendarSync } from "@/utils/google/syncBookingCalendar";
import { notifyClientUpdatedDetails } from "@/utils/push/bookingNotifications";
import { runAfterResponse } from "@/utils/runAfterResponse";

const clientDetailsUpdateSchema = z.object({
  client: z.string().min(1),
  contact: bookingContactSchema,
  party: z
    .array(
      partyMemberInputSchema.extend({
        moodboardUrls: z.array(z.string()).max(MAX_MOODBOARD_IMAGES).optional(),
      })
    )
    .min(1),
});

const clientDetailsFieldsSchema = bookingSchema
  .pick({
    contact: true,
    pax: true,
    party: true,
    clientDetails: true,
  })
  .partial();

/** Public: the client updates contact details, answers, and moodboard files. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const parsed = clientDetailsUpdateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return createResponse({ error: "Check the details and try again." }, 400);
    }

    const booking = await getBookingById(id);
    if (!booking || !bookingMatchesClient(booking, parsed.data.client)) {
      return createResponse({ error: "Booking not found" }, 404);
    }
    if (!isClientEditable(booking)) {
      return createResponse(
        { error: "This booking can no longer be changed." },
        409
      );
    }

    const settings = await new SettingModel().findSettingsByUserId(
      booking.freelancerUserId
    );
    const pax = getBookingPax(booking);
    if (parsed.data.party.length !== pax) {
      return createResponse({ error: "Add details for each person." }, 400);
    }

    let partyResult: ReturnType<typeof resolveBookingParty>;
    try {
      partyResult = resolveBookingParty(
        settings?.client_info,
        parsed.data.contact.name,
        pax,
        parsed.data.party,
        undefined
      );
    } catch (error) {
      return createResponse(
        {
          error:
            error instanceof Error
              ? error.message
              : "Check the details and try again.",
        },
        400
      );
    }

    const moodboardOn = Boolean(settings?.client_info?.moodboard);
    const storedParty = getBookingParty(booking);
    let party: Booking["party"];
    try {
      party = partyResult.party.map((member, index) => {
        const sent = parsed.data.party[index]?.moodboardUrls ?? [];
        const urls = moodboardOn
          ? sent
          : (storedParty[index]?.clientDetails?.moodboardUrls ?? []);
        const valid = urls.filter((url) =>
          isBookingMoodboardUrl(url, booking.freelancerUserId, id)
        );
        if (moodboardOn && valid.length !== urls.length) {
          throw new Error(
            "Those moodboard files don't belong to this booking."
          );
        }
        if (valid.length === 0) return member;
        return {
          ...member,
          clientDetails: {
            ...(member.clientDetails ?? {}),
            moodboardUrls: valid.slice(0, MAX_MOODBOARD_IMAGES),
          },
        };
      });
    } catch (error) {
      return createResponse(
        {
          error:
            error instanceof Error
              ? error.message
              : "Check the moodboard files and try again.",
        },
        400
      );
    }

    const clientDetails = party[0]?.clientDetails ?? null;
    await bookingModel.update(
      id,
      {
        contact: parsed.data.contact,
        pax,
        party,
        clientDetails,
      },
      clientDetailsFieldsSchema
    );
    scheduleBookingCalendarSync(id);

    const updated = await getBookingById(id);
    if (!updated) {
      return createResponse({ error: "Booking not found" }, 404);
    }

    runAfterResponse("Client details push", () =>
      notifyClientUpdatedDetails(updated)
    );

    return createResponse(await toClientFacingBooking(updated));
  } catch (error) {
    return handleError(error);
  }
}
