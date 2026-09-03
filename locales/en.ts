import type { Locale } from "./ms";

export const en: Locale = {
  // Common
  back: "Back",
  next: "Next",
  bookNow: "Book Now",
  loading: "Loading",
  
  // Client Profile
  reviews: "Reviews",
  clientFeedback: "Client feedback and work photos.",
  noReviews: "No reviews yet.",
  
  // Booking Steps
  packageSelection: "Package",
  eventSelection: "Events",
  dateTimeSelection: "Date & Time",
  locationSelection: "Location",
  contactDetails: "Details",
  reviewBooking: "Review",
  termsConditions: "Terms",
  payment: "Payment",
  
  // Package
  selectPackage: "Select your package",
  packagesAvailable: "packages available",
  session: "session",
  sessions: "sessions",
  
  // Events
  chooseEvents: "Choose your events",
  selectEvents: "Select the events you need",
  
  // Date & Time
  bookSession: "When would you like to book your {sessionName} session?",
  allSessionsScheduled: "All sessions scheduled",
  sessionsScheduled: "sessions scheduled",
  schedulingSession: "Scheduling session",
  availableSlots: "Available slots",
  allSlotsBooked: "All time slots are booked on this date.",
  yourBookings: "Your bookings",
  noSessionsYet: "No sessions yet — pick a date and time below.",
  addSession: "Add {sessionName} session",
  
  // Location
  bookingLocation: "Where would you like to book your session?",
  locationNotDecided: "If you have not decided on the location yet, you can just put in the area you are in.",
  sameLocationAll: "Same location for all sessions",
  locationAllSessions: "Location for all sessions",
  summary: "Summary",
  
  // Contact
  almostThere: "Almost there!\nJust need some final info...",
  phoneNumber: "Phone number",
  email: "Email",
  emailPlaceholder: "your@email.com",
  
  // Review
  reviewBooking_title: "Review your booking",
  bookingDetails: "Booking details",
  style: "Style",
  
  // Terms
  agreeTerms: "Terms & Conditions",
  readTerms: "Please read and agree to the terms and conditions",
  noTermsAvailable: "No terms and conditions available.",
  agreeCheckbox: "I have read and agree to the terms and conditions",
  agreeContinue: "Agree and continue",
  
  // Payment
  paymentTitle: "Pay in full",
  choosePayment: "Choose how to pay",
  sessionWithinDays: "Your session is within {days} day{plural}, so full payment is required.",
  paymentSecure: "Pay a deposit now, or settle the full amount upfront. Secure card payment through Stripe.",
  payDeposit: "Pay deposit — {amount}",
  payFull: "Pay in full — {amount}",
  balanceDue: "Balance of {amount} due {days} day{plural} before your session.",
  noBalanceLater: "Nothing left to pay later.",
  payNow: "Pay {amount} now",
  payDepositNow: "Pay {amount} deposit",
  redirectingStripe: "Redirecting to Stripe…",
  
  // Booking Result
  loadingBooking: "Loading booking…",
  bookingNotFound: "Booking not found.",
  confirmingPayment: "Confirming payment",
  bookingCompleted: "Booking completed",
  bookingFullyPaid: "Booking fully paid",
  bookingConfirmed: "Booking confirmed",
  paymentFailed: "Payment failed",
  bookingPending: "Booking pending",
  sessionDoneBeautifully: "Your session is done. We hope everything went beautifully.",
  paymentReceived: "Your payment of {amount} was received. You're all set.",
  depositReceived: "Your deposit of {depositAmount} was received. The remaining balance of {balanceAmount} is due before your session.",
  paymentNotProcessed: "We couldn't process your payment. You can try booking again or contact the stylist.",
  paymentAccepted: "Stripe accepted your payment. We're waiting for confirmation — this usually takes a few seconds.",
  bookingAwaitingPayment: "Your booking is awaiting payment. Complete checkout to secure your slot.",
  payRemainingBalance: "Pay remaining balance ({amount})",
  startingCheckout: "Starting checkout…",
  whatsapp: "WhatsApp {name}",
  
  // Invoice/Quotation
  invoice: "Invoice",
  quotation: "Quotation",
  paymentSummary: "Payment summary",
  reviewTotal: "Review your total before confirming.",
  total: "Total",
  depositDueNow: "Deposit due now",
  balancePayment: "Balance payment",
  amountDueNow: "Amount due now",
  balanceDueBefore: "Balance due {days} day{plural} before your session.",
  noLineItems: "No line items yet.",
};
