import { z } from "zod";

import { addressSchema } from "@/schemas/addressSchema";
import {
  bookingClientDetailsSchema,
  clientDetailsInputSchema,
} from "@/schemas/clientInfoSchema";
import { depositTypeSchema, packageDayModeSchema } from "@/schemas/packageSchema";
import { sessionSchema } from "@/schemas/sessionSchema";
import {
  type ManualTransferDetails,
  timeOfDaySchema,
  timeSlotSchema,
} from "@/schemas/settingSchema";

export const bookingContactSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  mobile: z.string().optional(),
  country_code: z.string().optional(),
});

/** Total people on a booking (booker included). */
export const MAX_BOOKING_PAX = 10;

export const bookingPaxSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_BOOKING_PAX);

/** One person sharing the booking's event / slots / style. */
export const partyMemberSchema = z.object({
  name: z.string().trim().min(1),
  clientDetails: bookingClientDetailsSchema.optional(),
});

export const partyMemberInputSchema = z.object({
  name: z.string().trim().min(1),
  clientDetails: clientDetailsInputSchema.optional(),
});

export type PartyMember = z.infer<typeof partyMemberSchema>;
export type PartyMemberInput = z.infer<typeof partyMemberInputSchema>;

const quotationAmountSchema = z.object({
  label: z.string(),
  amountRm: z.number(),
});

/** Itemised prices; `lineItems` folds the travel fee into the first item. */
export const quotationBreakdownSchema = z.object({
  sessions: z.array(
    quotationAmountSchema.extend({
      sessionKey: z.string().optional(),
      /** Morning call charge included in `amountRm`; the invoice PDF lists it separately. */
      morningCallRm: z.number().optional(),
      morningCallCount: z.number().int().optional(),
      /** Style extra charges included in `amountRm`; only the stylist's dashboard lists them. */
      styleExtras: z.array(quotationAmountSchema).optional(),
    })
  ),
  addOns: z.array(quotationAmountSchema),
  travelFeeRm: z.number(),
  /** Taken off the subtotal by the stylist; `lineItems` lists it as a negative "Discount". */
  discountRm: z.number().optional(),
  /** Fees already included in the amounts above (payment-gateway bookings), incl. `platformFeeRm`. */
  processingFeeRm: z.number().optional(),
  /** Bridalync's platform fee within `processingFeeRm`; collected as the Stripe application fee. */
  platformFeeRm: z.number().optional(),
  /** Part of `platformFeeRm` collected with the deposit charge; the balance charge takes the rest. */
  depositPlatformFeeRm: z.number().optional(),
  /** Stripe's fee on the second (balance) charge; included in the first session, dropped when paying in full. */
  splitPaymentFeeRm: z.number().optional(),
});

export const quotationSummarySchema = z.object({
  lineItems: z.array(quotationAmountSchema),
  totalRm: z.number(),
  depositRm: z.number(),
  balanceRm: z.number(),
  /** Missing on bookings saved before itemised pricing was recorded. */
  breakdown: quotationBreakdownSchema.optional(),
});

export const bookingSessionSchema = sessionSchema.extend({
  client_key: z.string().optional(),
});

export const paymentChannelSchema = z.enum([
  "manual_transfer",
  "payment_gateway",
]);

export const paymentVerificationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

export const BOOKING_REMARKS_MAX_LENGTH = 2000;

/** Session `packageId` for a one-off event that isn't in the catalog. */
export const OTHERS_EVENT_ID = "others";

export const CUSTOM_EVENT_NAME_MAX_LENGTH = 120;
export const CUSTOM_EVENT_DESCRIPTION_MAX_LENGTH = 500;
export const CUSTOM_ADD_ON_NAME_MAX_LENGTH = 120;

/** Price and deposit the stylist typed for an Others event. Stored so edits restore the pre-fee amounts. */
export const customEventSchema = z
  .object({
    name: z.string().trim().min(1).max(CUSTOM_EVENT_NAME_MAX_LENGTH),
    description: z
      .string()
      .trim()
      .max(CUSTOM_EVENT_DESCRIPTION_MAX_LENGTH)
      .optional(),
    price: z.number().min(0),
    deposit: z.number().min(0),
    depositType: depositTypeSchema,
  })
  .superRefine((value, ctx) => {
    if (value.depositType === "percent" && value.deposit > 100) {
      ctx.addIssue({
        code: "custom",
        message: "Deposit can't be more than 100%.",
        path: ["deposit"],
      });
    }
  });

export const customAddOnSchema = z.object({
  name: z.string().trim().min(1).max(CUSTOM_ADD_ON_NAME_MAX_LENGTH),
  price: z.number().min(0),
});

export type CustomEventInput = z.infer<typeof customEventSchema>;
export type CustomAddOnInput = z.infer<typeof customAddOnSchema>;

export const bookingSchema = z.object({
  _id: z.unknown().optional(),
  freelancerUsername: z.string(),
  freelancerUserId: z.string(),
  contact: bookingContactSchema,
  /**
   * People on the booking (booker first). Missing on older bookings = one person
   * from `contact` + top-level `clientDetails`.
   */
  pax: bookingPaxSchema.optional(),
  party: z.array(partyMemberSchema).min(1).max(MAX_BOOKING_PAX).optional(),
  /**
   * Instagram, moodboard and requested info for the booker.
   * Mirrored from `party[0].clientDetails` when a party is stored.
   */
  clientDetails: bookingClientDetailsSchema.nullish(),
  packageIds: z.array(z.string()).default([]),
  packageNames: z.string(),
  /** Set for an Others booking: a one-off event that isn't in the catalog. */
  customEvent: customEventSchema.nullish(),
  /** Add-ons typed on an Others (or any manual) booking, priced as entered rather than from the catalog. */
  customAddOns: z.array(customAddOnSchema).optional(),
  /**
   * The event's day rule when booked. Missing = booked before multi-session events
   * (several events, one session each, multi-slot sessions); those keep their old rules when edited.
   */
  dayMode: packageDayModeSchema.optional(),
  addOnIds: z.array(z.string()),
  sessions: z.array(bookingSessionSchema),
  invoice: quotationSummarySchema,
  paymentOption: z.enum(["deposit", "full"]).default("deposit"),
  /** `requested` = waiting for the stylist to approve (booking requests setting); approving makes it `pending`. */
  status: z.enum([
    "requested",
    "pending",
    "confirmed",
    "completed",
    "failed",
    "enquiry",
    "cancelled",
  ]),
  /** Set when the stylist approved a booking request; the client then pays from the booking page. */
  requestApprovedAt: z.coerce.date().optional(),
  /** Deposit/full picked with a transfer receipt on an approved request; applied when the receipt is approved. */
  requestPaymentOption: z.enum(["deposit", "full"]).optional(),
  /** Stylist's private notes; never shown to the client. */
  remarks: z.string().max(BOOKING_REMARKS_MAX_LENGTH).optional(),
  /** Set when the stylist created the booking unpaid (`pending`) for the client to pay via the booking page link. */
  paymentLinkAt: z.coerce.date().optional(),
  /** Set when the stylist declined a booking request (status becomes `cancelled`). */
  requestDeclinedAt: z.coerce.date().optional(),
  source: z.enum(["bridalync", "google_calendar"]).default("bridalync"),
  googleEventId: z.string().min(1).optional(),
  paymentChannel: paymentChannelSchema.optional(),
  depositReceiptUrl: z.string().optional(),
  depositVerificationStatus: paymentVerificationStatusSchema.optional(),
  balanceReceiptUrl: z.string().optional(),
  balanceVerificationStatus: paymentVerificationStatusSchema.optional(),
  /** Missing on bookings paid before payment times were recorded. */
  depositPaidAt: z.coerce.date().optional(),
  balancePaidAt: z.coerce.date().optional(),
  /** Balance amount settled at `balancePaidAt`; the invoice folds it into `depositRm`. */
  balancePaidRm: z.number().optional(),
  stripeCheckoutSessionId: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
  /** Keys of sessions that already received an upcoming-session push. */
  sessionRemindersSent: z.array(z.string()).optional(),
  /** When the client was emailed a balance-due reminder. */
  balanceReminderSentAt: z.coerce.date().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
});

export type Booking = z.infer<typeof bookingSchema>;

/** Booking loaded from the database — always has an `_id`. */
export type PersistedBooking = Booking & { _id: unknown };

export const bookingLineItemInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  deposit: z.number().optional(),
  categoryName: z.string().optional(),
});

const bookingSessionInputSchema = z.object({
  client_key: z.string(),
  status: z.literal("scheduled"),
  name: z.string(),
  packageId: z.string().min(1),
  order: z.number(),
  date: z.coerce.date(),
  time_slot: timeSlotSchema,
  ready_by: timeOfDaySchema.optional(),
  location: addressSchema,
  style: bookingLineItemInputSchema.optional(),
});

export const createBookingRequestSchema = z
  .object({
    freelancerUsername: z.string().min(1),
    intent: z.enum(["booking", "enquiry"]).default("booking"),
    contact: bookingContactSchema,
    /** Total people including the booker. Missing = 1. */
    pax: bookingPaxSchema.optional(),
    /**
     * One entry per person. Required when `pax` > 1.
     * When omitted with `pax` 1, `clientDetails` is used for the booker.
     */
    party: z.array(partyMemberInputSchema).min(1).max(MAX_BOOKING_PAX).optional(),
    /** Booker-only fallback when `party` is omitted. */
    clientDetails: clientDetailsInputSchema.optional(),
    packageIds: z.array(z.string()).min(1),
    addOns: z.array(bookingLineItemInputSchema).default([]),
    /** Clients must give every session a ready-by time. */
    sessions: z
      .array(bookingSessionInputSchema)
      .min(1)
      .refine((sessions) => sessions.every((session) => session.ready_by), {
        message: "Every session needs a ready-by time.",
      }),
    paymentOption: z.enum(["deposit", "full"]).default("deposit"),
  })
  .superRefine((value, ctx) => {
    const pax = value.pax ?? 1;
    if (value.party) {
      if (value.party.length !== pax) {
        ctx.addIssue({
          code: "custom",
          message: "Add details for each person.",
          path: ["party"],
        });
      }
      if (
        value.party[0] &&
        value.party[0].name.trim() !== value.contact.name.trim()
      ) {
        ctx.addIssue({
          code: "custom",
          message: "The first person must match the booking contact name.",
          path: ["party", 0, "name"],
        });
      }
    } else if (pax !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Add details for each person.",
        path: ["party"],
      });
    }
  });

export type CreateBookingRequest = z.infer<typeof createBookingRequestSchema>;

export const publicBookingFreelancerSchema = z.object({
  name: z.string(),
  mobile: z.string(),
  country_code: z.string(),
});

export const publicBookingSchema = bookingSchema
  .omit({
    freelancerUserId: true,
    stripeCheckoutSessionId: true,
    stripePaymentIntentId: true,
    sessionRemindersSent: true,
    balanceReminderSentAt: true,
    remarks: true,
  })
  .extend({
    _id: z.string(),
    freelancer: publicBookingFreelancerSchema.optional(),
    stylistPaymentMethod: paymentChannelSchema.optional(),
    /** Stylist's balance-due window (days before the first session); decides if an approved request can pay a deposit. */
    balanceDueBeforeDays: z.number().optional(),
    /** Whether Morning call is listed as its own priced line. Missing = shown. */
    showMorningCallPrice: z.boolean().optional(),
    manualTransfer: z
      .object({
        qrImageUrl: z.string(),
        payeeName: z.string(),
        bankName: z.string(),
        accountNumber: z.string(),
      })
      .optional(),
  });

export type PublicBookingFreelancer = z.infer<typeof publicBookingFreelancerSchema>;
export type PublicBooking = z.infer<typeof publicBookingSchema>;

export function toPublicBooking(
  booking: PersistedBooking,
  freelancer?: PublicBookingFreelancer | null,
  stylistPaymentMethod?: z.infer<typeof paymentChannelSchema> | null,
  manualTransfer?: ManualTransferDetails | null,
  balanceDueBeforeDays?: number,
  showMorningCallPrice?: boolean
): PublicBooking {
  const {
    freelancerUserId,
    stripeCheckoutSessionId,
    stripePaymentIntentId,
    sessionRemindersSent,
    balanceReminderSentAt,
    ...rest
  } = booking;

  const id =
    typeof booking._id === "string"
      ? booking._id
      : (booking._id as { toString(): string }).toString();

  return publicBookingSchema.parse({
    ...rest,
    _id: id,
    ...(freelancer ? { freelancer } : {}),
    ...(stylistPaymentMethod
      ? { stylistPaymentMethod }
      : {}),
    ...(manualTransfer ? { manualTransfer } : {}),
    ...(balanceDueBeforeDays != null ? { balanceDueBeforeDays } : {}),
    ...(showMorningCallPrice != null ? { showMorningCallPrice } : {}),
  });
}

export const updateBookingStatusSchema = z.object({
  freelancerUsername: z.string().min(1),
  status: z.enum(["pending", "confirmed", "failed", "cancelled"]),
});

export const bookingStatusSchema = bookingSchema.shape.status;

/** Base object only — refinements live on the exported schemas so `.partial()` still works. */
const manualBookingInputObjectSchema = z.object({
  contact: bookingContactSchema,
  /** Total people including the booker. Missing = 1. */
  pax: bookingPaxSchema.optional(),
  /**
   * Guest names (and optional Instagram) beyond the booker.
   * Booker is always `contact` + `instagram`; length should be `pax` when sent.
   */
  party: z.array(partyMemberInputSchema).max(MAX_BOOKING_PAX).optional(),
  /** Empty when `customEvent` is set. */
  packageIds: z.array(z.string()).default([]),
  /** One-off event. When set, `packageIds` is ignored. */
  customEvent: customEventSchema.nullish(),
  customAddOns: z.array(customAddOnSchema).default([]),
  /**
   * Optional on manual bookings even when Client information requires it.
   * Blank clears it. Normalized server-side. Applied to the booker (party[0]).
   */
  instagram: z.string().max(100).optional(),
  addOns: z.array(bookingLineItemInputSchema).default([]),
  sessions: z.array(bookingSessionInputSchema).min(1),
  paymentOption: z.enum(["deposit", "full"]).default("deposit"),
  status: bookingStatusSchema.default("confirmed"),
  /** Discounted total; omitted = full price. Must not exceed the calculated subtotal. */
  totalRm: z.number().min(0).optional(),
  /**
   * Ignored. New manual bookings are always created unpaid for the client to pay from a link.
   * Kept so older clients don't fail validation.
   */
  payByLink: z.boolean().optional(),
  /** Blank clears it. */
  remarks: z.string().trim().max(BOOKING_REMARKS_MAX_LENGTH).optional(),
});

function refineManualBookingParty(
  value: {
    contact?: { name: string };
    pax?: number;
    party?: PartyMemberInput[];
  },
  ctx: z.RefinementCtx
) {
  const pax = value.pax ?? 1;
  if (!value.party) {
    if (pax !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Add a name for each person.",
        path: ["party"],
      });
    }
    return;
  }
  if (value.party.length !== pax) {
    ctx.addIssue({
      code: "custom",
      message: "Add a name for each person.",
      path: ["party"],
    });
  }
  if (
    value.contact &&
    value.party[0] &&
    value.party[0].name.trim() !== value.contact.name.trim()
  ) {
    ctx.addIssue({
      code: "custom",
      message: "The first person must match the booking contact name.",
      path: ["party", 0, "name"],
    });
  }
}

export const manualBookingInputSchema = manualBookingInputObjectSchema.superRefine(
  refineManualBookingParty
);

export type ManualBookingInput = z.infer<typeof manualBookingInputSchema>;

export const dashboardBookingUpdateSchema = manualBookingInputObjectSchema
  .partial()
  .extend({
    contact: bookingContactSchema.optional(),
    sessions: z.array(bookingSessionInputSchema).min(1).optional(),
  })
  .superRefine((value, ctx) => {
    // Only check party shape when the patch touches pax/party (contact may be omitted).
    if (value.pax === undefined && value.party === undefined) return;
    refineManualBookingParty(value, ctx);
  });

export type DashboardBookingUpdate = z.infer<typeof dashboardBookingUpdateSchema>;

export const rescheduleSessionSchema = z.object({
  client_key: z.string().min(1),
  date: z.coerce.date(),
  time_slot: timeSlotSchema,
});

export type RescheduleSessionInput = z.infer<typeof rescheduleSessionSchema>;
