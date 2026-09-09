import type { Locale } from "./ms";

export const en: Locale = {
  // Common
  back: "Back",
  next: "Next",
  skip: "Skip",
  bookNow: "Book Now",
  selectLanguage: "Select language",
  somethingWentWrong: "Something went wrong. Please try again.",

  // Client profile
  loadingProfile: "Loading profile…",
  profileNotFound: "Profile not found.",
  hijabStylist: "Hijab Stylist",
  makeupArtist: "Makeup Artist",
  reviews: "Reviews",
  clientFeedback: "Client feedback and work photos.",
  noReviews: "No reviews yet.",
  reviewDetails: "Review details",
  reviewPhotoAlt: "{name} review photo",
  viewFullSizePhoto: "View full size photo from {name}",
  fullSizeReviewPhoto: "Full size review photo",
  closePhoto: "Close photo",

  // Progress stepper
  stepName: "Name",
  stepEvent: "Event",
  stepDate: "Date",
  stepLocation: "Location",
  stepStyle: "Style",
  stepPayment: "Payment",

  // Name
  nameQuestion: "But first,\nWhat should I call you?",
  namePlaceholder: "Your name",
  phonePlaceholder: "e.g. 123456789",
  countryCode: "Country code",

  // Events / packages
  eventQuestion: "What event are you booking for?",
  eventHelper: "Choose the package that matches your event.",
  loadingPackages: "Loading packages...",
  noPackagesAvailable: "No packages available.",
  sessionCount: "{count} {count, session, sessions}",

  // Date & time
  bookSession: "When would you like to book your {sessionName} session?",
  allSessionsScheduled: "All sessions scheduled",
  sessionsScheduledCount:
    "{scheduled} of {total} {total, session, sessions} scheduled",
  schedulingSession: "Scheduling session {current} of {total}:",
  availableSlots: "Available slots",
  allSlotsBooked: "All time slots are booked on this date.",
  yourBookings: "Your bookings",
  noSessionsYet: "No sessions yet — pick a date and time below.",
  noSessionsPickEvent: "No sessions yet — pick an event, date, and time.",
  addSession: "Add {sessionName} session",
  removeSession: "Remove {sessionName} session",

  // Location
  bookingLocation: "Where would you like to book your session?",
  locationNotDecided:
    "If you have not decided on the location yet, you can just put in the area you are in.",
  mapHint:
    "Search for a venue, then drag the pin or tap the map to refine the exact spot.",
  pinnedOnMap: "Pinned on map",
  selectedLocation: "Selected location",
  sameLocationAll: "Same location for all sessions",
  locationAllSessions: "Location for all sessions",
  summary: "Summary",
  calculatingDistance: "Calculating road distance...",
  distanceUnavailable: "Road distance unavailable right now.",
  distanceAway: "{distance} km away by road",

  // Style
  chooseStyle: "Choose your hijab style",
  chooseStyleHelper: "Pick a look, then choose a variant.",
  noStylesAvailable: "No styles available.",
  noVariantsAvailable: "No variants available.",
  noImage: "No image",
  previousVariant: "Previous variant",
  nextVariant: "Next variant",
  showVariant: "Show {name}",

  // Add-ons
  addOnsTitle: "Any add-ons?",
  addOnsHelper: "Optional extras — pick any that apply, or skip.",
  noAddOnsAvailable: "No add-ons available.",

  // Contact
  almostThere: "Almost there!\nJust need some final info...",
  phoneNumber: "Phone number",
  email: "Email",
  emailPlaceholder: "your@email.com",

  // Review
  reviewBookingTitle: "Review your booking",

  // Terms
  termsTitle: "Terms and Conditions",
  noTermsAvailable: "No terms and conditions available.",
  agreeCheckbox: "I have read and agree to the terms and conditions",
  agreeContinue: "Agree and continue",

  // Payment
  payInFull: "Choose how to pay",
  choosePayment: "Choose how to pay",
  paymentOptionLabel: "Payment option",
  sessionWithinDays:
    "Your session is within {days} {days, day, days}, so full payment is required.",
  paymentSecure:
    "Pay a deposit now, or settle the full amount upfront. Secure card payment through Stripe.",
  payFullOption: "Pay in full — {amount}",
  payDepositOption: "Pay deposit — {amount}",
  noBalanceLater: "Nothing left to pay later.",
  balanceDue:
    "Balance of {amount} due {days} {days, day, days} before your session.",
  payNow: "Pay {amount} now",
  payDepositNow: "Pay {amount} deposit",
  redirectingStripe: "Redirecting to Stripe…",
  couldNotCreateBooking: "Could not create booking.",
  couldNotStartCheckout: "Could not start Stripe Checkout.",
  paymentCouldNotStart: "Payment could not be started.",

  // WhatsApp
  chatOnWhatsApp: "Chat on WhatsApp",
  dragToChat: "Drag to move · Tap to chat",
  whatsapp: "WhatsApp {name}",
  stylist: "stylist",

  // Booking result
  loadingBooking: "Loading booking…",
  bookingNotFound: "Booking not found.",
  couldNotLoadBooking: "Could not load booking.",
  confirmingPayment: "Confirming payment",
  bookingCompleted: "Booking completed",
  bookingFullyPaid: "Booking fully paid",
  bookingConfirmed: "Booking confirmed",
  paymentFailed: "Payment failed",
  bookingPending: "Booking pending",
  sessionDoneBeautifully:
    "Your session is done. We hope everything went beautifully.",
  paymentReceived: "Your payment of {amount} was received. You're all set.",
  depositReceived:
    "Your deposit of {depositAmount} was received. The remaining balance of {balanceAmount} is due before your session.",
  paymentNotProcessed:
    "We couldn't process your payment. You can try booking again or contact the stylist.",
  paymentAccepted:
    "Stripe accepted your payment. We're waiting for confirmation — this usually takes a few seconds.",
  webhookHint:
    "If this takes longer than a minute, the payment webhook may not be reaching your app. For local dev, run",
  bookingAwaitingPayment:
    "Your booking is awaiting payment. Complete checkout to secure your slot.",
  payRemainingBalance: "Pay remaining balance ({amount})",
  startingCheckout: "Starting checkout…",
  couldNotStartBalancePayment: "Could not start balance payment.",
  bookingDetails: "Booking details",
  styleLabel: "Style",

  // Invoice / quotation
  invoice: "Invoice",
  quotation: "Quotation",
  paymentSummary: "Payment summary",
  reviewTotal: "Review your total before confirming.",
  sessionsHeading: "Sessions",
  total: "Total",
  depositDueNow: "Deposit due now",
  balancePayment: "Balance payment",
  amountDueNow: "Amount due now",
  balanceDueBefore: "Balance due {days} {days, day, days} before your session.",
  noLineItems: "No line items.",
  noLineItemsYet: "No line items yet.",
};
