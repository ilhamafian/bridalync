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
  reviewsLoadFailed: "Couldn't load reviews.",
  tryAgain: "Try again",
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
  eventHelper: "Choose one event for your booking.",
  loadingPackages: "Loading packages...",
  noPackagesAvailable: "No packages available.",
  sessionCount: "{count} {count, session, sessions}",

  // Date & time
  bookSession: "When would you like to book your {sessionName} session?",
  allSessionsScheduled: "All sessions scheduled",
  sessionsScheduledCount:
    "{scheduled} of {total} {total, session, sessions} scheduled",
  availableSlots: "Available slots",
  sameDayHint: "All sessions of this event are on the same day.",
  differentDayHint: "Each session of this event is on a different day.",
  slotCount: "{count} consecutive slots",
  allSlotsBooked: "All time slots are booked on this date.",
  readyByLabel: "What time do you need to be ready by?",
  readyByHelper: "The exact time you need to be done, so we can plan when to arrive.",
  readyBy: "Ready by {time}",
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
  accommodationTitle: "Accommodation & transport",
  accommodationDescription:
    "Your venue is outside {state}, where your stylist is based. You'll need to provide accommodation and transport for your stylist.",
  accommodationCancel: "Change location",
  accommodationAgree: "I understand",
  checkingVenueState: "Checking the venue's state...",
  venueStateUnavailable: "Couldn't check the venue's state right now.",
  venueOutsideServiceArea: "This venue is outside the areas served.",
  regionNotServed: "{region} isn't served yet. Choose a venue in another state.",
  distanceAway: "{distance} km away by road",

  // Style
  chooseStyle: "Choose your hijab style",
  chooseStyleHelper: "Pick a look for each session.",
  chooseStyleForSession: "Choose style for {sessionName}",
  sessionOfTotal: "Session {current} of {total}",
  noStylesAvailable: "No styles available.",
  // Makeup artists call styles "looks"
  stepLook: "Look",
  chooseLook: "Choose your look",
  chooseLookHelper: "Pick a look for each session.",
  chooseLookForSession: "Choose look for {sessionName}",
  noLooksAvailable: "No looks available.",
  noVariantsAvailable: "No variants available.",
  noImage: "No image",
  previousVariant: "Previous variant",
  nextVariant: "Next variant",
  showVariant: "Show {name}",
  showVariantImage: "Show photo {index} of {name}",

  // Add-ons
  addOnsTitle: "Any add-ons?",
  addOnsHelper: "Optional extras — pick any that apply, or skip.",
  noAddOnsAvailable: "No add-ons available.",

  // Contact
  almostThere: "Almost there!\nJust need some final info...",
  phoneNumber: "Phone number",
  email: "Email",
  emailPlaceholder: "your@email.com",
  instagramUsername: "Instagram username",
  instagramPlaceholder: "yourusername",
  invalidInstagram: "Enter a valid Instagram username.",
  optionalLabel: "Optional",
  typeYourAnswer: "Type your answer",
  moodboard: "Moodboard",
  moodboardHelper: "Share up to {max} inspiration photos or PDFs.",
  addFiles: "Add photos or PDFs",
  removePhoto: "Remove file {index}",
  moodboardPdfTooLarge: "PDFs must be {size} MB or smaller.",

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
  paymentManualSecure:
    "Pay a deposit now, or settle the full amount first. Transfer to the stylist and upload your receipt.",
  payFullOption: "Pay in full — {amount}",
  payDepositOption: "Pay deposit — {amount}",
  noBalanceLater: "Nothing left to pay later.",
  balanceDue:
    "Balance of {amount} due {days} {days, day, days} before your session.",
  payNow: "Pay {amount} now",
  payDepositNow: "Pay {amount} deposit",
  redirectingStripe: "Redirecting to Stripe…",  submittingReceipt: "Submitting receipt…",
  submitReceipt: "Submit receipt & book",
  transferAmountDue: "Amount due: {amount}",
  receiptRequired: "Upload your payment receipt to continue.",
  bookingPendingVerification:
    "Thanks! Your booking is held while the stylist verifies your payment receipt.",
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
    "We're confirming your payment with Stripe — this usually takes a few seconds. Your booking is not confirmed until payment succeeds.",
  webhookHint:
    "This is taking longer than usual. If your bank payment is still processing, hang tight. If it failed or the booking does not update soon, contact the stylist or Bridalync support with your email.",
  bookingAwaitingPayment:
    "Your booking is awaiting payment. Complete checkout to secure your slot.",
  bookingAwaitingVerification:
    "Your booking is held while the stylist verifies your payment receipt. You'll get a confirmation once it's approved.",
  payRemainingBalance: "Pay remaining balance ({amount})",
  submitBalanceReceipt: "Submit balance receipt",
  startingCheckout: "Starting checkout…",
  couldNotStartBalancePayment: "Could not start balance payment.",
  balanceReceiptPending:
    "Your balance receipt is pending verification by the stylist.",
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

  // Booking review
  reviewTitle: "How was your experience with {name}?",
  reviewSubtitle:
    "Your review helps {name} grow and helps other brides decide.",
  reviewPlaceholder: "Share your experience…",
  reviewSubmit: "Submit review",
  reviewSubmitting: "Submitting…",
  reviewThanksTitle: "Thank you!",
  reviewThanksBody: "Your review has been sent to {name}.",
  reviewAlreadySubmitted: "A review for this booking was already submitted. Thank you!",
  reviewNotAvailable: "This booking can't be reviewed yet.",
  reviewCouldNotSubmit: "Could not submit your review. Please try again.",
  reviewRequired: "Please write a short review.",
  reviewingAs: "Reviewing as {name}",
  reviewAddPhotos: "Add photos ({count}/{max})",
  reviewUploadingPhotos: "Uploading…",
  reviewRemovePhoto: "Remove photo",
  reviewPhotoLimit: "You can upload up to {max} photos.",
  reviewPhotoUploadFailed: "Could not upload photo.",
};
