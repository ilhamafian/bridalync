import { format } from "date-fns";

import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import { getEarliestSessionDate } from "@/utils/booking/pricing";
import { getMonthRange, getWeekRange } from "@/utils/dashboard";
import { invoiceNumberFromBookingId } from "@/utils/invoice/invoiceNumber";

export type PaymentKind = "deposit" | "balance" | "full";

export type PaymentRecord = {
  id: string;
  bookingId: string;
  clientName: string;
  packageName: string;
  kind: PaymentKind;
  amountRm: number;
  at: string;
};

export type WeekSummary = {
  revenueRm: number;
  paymentCount: number;
  clientCount: number;
};

export type OutstandingClient = {
  bookingId: string;
  clientName: string;
  packageName: string;
  sessionDate: string;
  balanceRm: number;
  countryCode?: string;
  mobile?: string;
};

export type OutstandingSummary = {
  totalRm: number;
  clients: OutstandingClient[];
};

export type MonthlyReport = {
  /** `yyyy-MM` */
  key: string;
  label: string;
  daysInMonth: number;
  /** Revenue per day, from day 1 up to today (current month) or month end. */
  dailyRm: number[];
  totalRm: number;
  paymentCount: number;
};

export type InvoiceItem = {
  bookingId: string;
  invoiceNumber: string;
  clientName: string;
  packageName: string;
  totalRm: number;
  paidRm: number;
  issuedAt: string;
};

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  deposit: "Deposit",
  balance: "Balance",
  full: "Full payment",
};

function isPaidBooking(booking: SerializedBooking) {
  return booking.status === "confirmed" || booking.status === "completed";
}

function isValidDate(value: string | undefined): value is string {
  return Boolean(value) && !Number.isNaN(new Date(value as string).getTime());
}

/** Payments received for one booking, derived from its invoice state. */
function getBookingPayments(booking: SerializedBooking): PaymentRecord[] {
  if (!isPaidBooking(booking)) return [];

  const base = {
    bookingId: booking._id,
    clientName: booking.contact.name,
    packageName: booking.packageNames,
  };
  const depositAt = booking.depositPaidAt ?? booking.created_at;
  const payments: PaymentRecord[] = [];

  if (booking.balancePaidRm && booking.balancePaidRm > 0) {
    const depositRm = booking.invoice.totalRm - booking.balancePaidRm;
    if (depositRm > 0 && isValidDate(depositAt)) {
      payments.push({
        ...base,
        id: `${booking._id}-deposit`,
        kind: "deposit",
        amountRm: depositRm,
        at: depositAt,
      });
    }
    const balanceAt = booking.balancePaidAt ?? booking.updated_at;
    if (isValidDate(balanceAt)) {
      payments.push({
        ...base,
        id: `${booking._id}-balance`,
        kind: "balance",
        amountRm: booking.balancePaidRm,
        at: balanceAt,
      });
    }
    return payments;
  }

  if (booking.invoice.depositRm > 0 && isValidDate(depositAt)) {
    const kind: PaymentKind =
      booking.paymentOption === "full" || booking.invoice.balanceRm <= 0
        ? "full"
        : "deposit";
    payments.push({
      ...base,
      id: `${booking._id}-${kind}`,
      kind,
      amountRm: booking.invoice.depositRm,
      at: depositAt,
    });
  }
  return payments;
}

/** All payments, newest first. */
export function getPayments(bookings: SerializedBooking[]): PaymentRecord[] {
  return bookings
    .flatMap(getBookingPayments)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function inRange(at: string, start: Date, end: Date) {
  const time = new Date(at).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export function getWeekSummary(
  payments: PaymentRecord[],
  now = new Date()
): WeekSummary {
  const { start, end } = getWeekRange(now);
  const thisWeek = payments.filter((payment) =>
    inRange(payment.at, start, end)
  );
  return {
    revenueRm: thisWeek.reduce((sum, payment) => sum + payment.amountRm, 0),
    paymentCount: thisWeek.length,
    clientCount: new Set(thisWeek.map((payment) => payment.bookingId)).size,
  };
}

/** Unpaid balances for bookings whose first session falls in this month. */
export function getOutstandingThisMonth(
  bookings: SerializedBooking[],
  now = new Date()
): OutstandingSummary {
  const { start, end } = getMonthRange(now);
  const clients: OutstandingClient[] = [];

  for (const booking of bookings) {
    if (!isPaidBooking(booking) || booking.invoice.balanceRm <= 0) continue;
    const sessionDate = getEarliestSessionDate(booking.sessions);
    if (!sessionDate || !inRange(sessionDate.toISOString(), start, end)) {
      continue;
    }
    clients.push({
      bookingId: booking._id,
      clientName: booking.contact.name,
      packageName: booking.packageNames,
      sessionDate: sessionDate.toISOString(),
      balanceRm: booking.invoice.balanceRm,
      countryCode: booking.contact.country_code,
      mobile: booking.contact.mobile,
    });
  }

  clients.sort(
    (a, b) =>
      new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
  );

  return {
    totalRm: clients.reduce((sum, client) => sum + client.balanceRm, 0),
    clients,
  };
}

/** Current month first, then the `count - 1` months before it. */
export function getMonthlyReports(
  payments: PaymentRecord[],
  now = new Date(),
  count = 6
): MonthlyReport[] {
  const reports: MonthlyReport[] = [];

  for (let offset = 0; offset < count; offset += 1) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const { start, end } = getMonthRange(monthStart);
    const daysInMonth = end.getDate();
    const plottedDays = offset === 0 ? now.getDate() : daysInMonth;
    const dailyRm = Array.from({ length: plottedDays }, () => 0);
    let paymentCount = 0;

    for (const payment of payments) {
      if (!inRange(payment.at, start, end)) continue;
      const day = new Date(payment.at).getDate();
      if (day > plottedDays) continue;
      dailyRm[day - 1] += payment.amountRm;
      paymentCount += 1;
    }

    reports.push({
      key: format(monthStart, "yyyy-MM"),
      label:
        monthStart.getFullYear() === now.getFullYear()
          ? format(monthStart, "MMM")
          : format(monthStart, "MMM yyyy"),
      daysInMonth,
      dailyRm,
      totalRm: dailyRm.reduce((sum, amount) => sum + amount, 0),
      paymentCount,
    });
  }

  return reports;
}

/** Bookings with at least one payment, newest payment first. */
export function getInvoices(
  bookings: SerializedBooking[],
  payments: PaymentRecord[]
): InvoiceItem[] {
  const latestPaymentAt = new Map<string, string>();
  for (const payment of payments) {
    if (!latestPaymentAt.has(payment.bookingId)) {
      latestPaymentAt.set(payment.bookingId, payment.at);
    }
  }

  return bookings
    .filter((booking) => latestPaymentAt.has(booking._id))
    .map((booking) => ({
      bookingId: booking._id,
      invoiceNumber: invoiceNumberFromBookingId(booking._id),
      clientName: booking.contact.name,
      packageName: booking.packageNames,
      totalRm: booking.invoice.totalRm,
      paidRm: booking.invoice.totalRm - Math.max(booking.invoice.balanceRm, 0),
      issuedAt: latestPaymentAt.get(booking._id) as string,
    }))
    .sort(
      (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
    );
}
