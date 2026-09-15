import PDFDocument from "pdfkit";
import { format, subDays } from "date-fns";

import type { PersistedBooking } from "@/schemas/bookingSchema";
import type { InvoiceSetting, PaymentSetting } from "@/schemas/settingSchema";
import {
  formatRm,
  getEarliestSessionDate,
  roundRm,
} from "@/utils/booking/pricing";
import { formatLocationAddress } from "@/utils/session";

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_Y = PAGE_HEIGHT - 40;

const INK = "#1a1a1a";
const MUTED = "#6b6b6b";
const FAINT = "#9a9a9a";
const RULE = "#e6e6e6";
const RULE_STRONG = "#1a1a1a";
const WASH = "#f6f5f3";
const WASH_DARK = "#efece8";

const BRIDALYNC_COMPANY_NAME = "BRIDALYNC SERVICES";
const BRIDALYNC_REGISTRATION = "202603170540 (LA0090837-D)";

export type InvoiceFreelancer = {
  username: string;
  email?: string | null;
  mobile?: string | null;
  country_code?: string | null;
};

export type GenerateBookingInvoicePdfInput = {
  booking: PersistedBooking;
  freelancer: InvoiceFreelancer;
  invoiceSettings?: Pick<InvoiceSetting, "company_registration_number"> | null;
  paymentSettings?: Pick<PaymentSetting, "balance_due_before"> | null;
  /** When the payment was confirmed / invoice issued. Defaults to now. */
  issuedAt?: Date;
};

type InvoiceLineRow = {
  label: string;
  quantity: number;
  unitPriceRm: number;
  totalRm: number;
};

function toDate(value: Date | string | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatPhone(
  countryCode?: string | null,
  mobile?: string | null
): string | null {
  const code = countryCode?.trim();
  const number = mobile?.trim();
  if (!number) return null;
  if (!code) return number;
  return `${code} ${number}`;
}

function formatTimeLabel(hhmm: string): string {
  const [hourRaw, minuteRaw] = hhmm.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return hhmm;

  const period = hour >= 12 ? "pm" : "am";
  const displayHour = hour % 12 || 12;
  if (minute === 0) return `${displayHour}${period}`;
  return `${displayHour}.${String(minute).padStart(2, "0")}${period}`;
}

function invoiceNumberFromBookingId(bookingId: string): string {
  const hex = bookingId.replace(/[^a-f0-9]/gi, "").slice(-6);
  if (!hex) return "0001";
  const numeric = Number.parseInt(hex, 16) % 1_000_000;
  return String(numeric).padStart(4, "0");
}

function amountPaidRm(booking: PersistedBooking): number {
  if (
    booking.paymentOption === "full" ||
    booking.invoice.balanceRm === 0
  ) {
    return booking.invoice.totalRm;
  }
  return booking.invoice.depositRm;
}

function buildLineRows(booking: PersistedBooking): InvoiceLineRow[] {
  const rows: InvoiceLineRow[] = [];

  for (const item of booking.invoice.lineItems) {
    const amount = roundRm(item.amountRm);
    const existing = rows.find(
      (row) => row.label === item.label && row.unitPriceRm === amount
    );
    if (existing) {
      existing.quantity += 1;
      existing.totalRm = roundRm(existing.unitPriceRm * existing.quantity);
      continue;
    }
    rows.push({
      label: item.label,
      quantity: 1,
      unitPriceRm: amount,
      totalRm: amount,
    });
  }

  if (rows.length === 0 && booking.packageNames.trim()) {
    rows.push({
      label: booking.packageNames,
      quantity: 1,
      unitPriceRm: roundRm(booking.invoice.totalRm),
      totalRm: roundRm(booking.invoice.totalRm),
    });
  }

  return rows;
}

function drawRule(
  doc: PDFKit.PDFDocument,
  y: number,
  color = RULE,
  width = 0.75
) {
  doc
    .strokeColor(color)
    .lineWidth(width)
    .moveTo(MARGIN, y)
    .lineTo(PAGE_WIDTH - MARGIN, y)
    .stroke();
}

function drawLabel(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  opts?: { width?: number; align?: "left" | "right" | "center" }
) {
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor(FAINT)
    .text(text.toUpperCase(), x, y, {
      width: opts?.width,
      align: opts?.align,
      characterSpacing: 1.1,
      lineBreak: false,
    });
}

export async function generateBookingInvoicePdf(
  input: GenerateBookingInvoicePdfInput
): Promise<Buffer> {
  const {
    booking,
    freelancer,
    invoiceSettings,
    paymentSettings,
    issuedAt = new Date(),
  } = input;

  const bookingId = String(booking._id);
  const invoiceNo = invoiceNumberFromBookingId(bookingId);
  const paidRm = amountPaidRm(booking);
  const balanceRm = roundRm(booking.invoice.balanceRm);
  const totalRm = roundRm(booking.invoice.totalRm);
  const lineRows = buildLineRows(booking);

  const earliestSession = getEarliestSessionDate(booking.sessions);
  const balanceDueBefore = paymentSettings?.balance_due_before ?? 3;
  const dueDate =
    earliestSession != null
      ? subDays(earliestSession, balanceDueBefore)
      : issuedAt;

  const billToLocation =
    booking.sessions.find((session) => session.location)?.location ?? null;
  const billToPhone = formatPhone(
    booking.contact.country_code,
    booking.contact.mobile
  );
  const freelancerPhone = formatPhone(
    freelancer.country_code,
    freelancer.mobile
  );

  const registration =
    invoiceSettings?.company_registration_number?.trim() ||
    BRIDALYNC_REGISTRATION;
  const dueDays = paymentSettings?.balance_due_before ?? 3;
  const dayLabel = dueDays === 1 ? "day" : "days";
  const termsText = `The remaining balance must be paid no later than ${dueDays} ${dayLabel} before the scheduled session. Services will not be carried out without full payment. The booking fee will be considered non-refundable.`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      bufferPages: true,
      info: {
        Title: `Invoice ${invoiceNo}`,
        Author: BRIDALYNC_COMPANY_NAME,
        Subject: `Booking invoice for ${booking.contact.name}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Soft page wash via top brand bar only (keeps print-friendly)
    doc.rect(0, 0, PAGE_WIDTH, 6).fill(INK);

    let y = MARGIN + 8;

    // --- Header ---
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(INK)
      .text(BRIDALYNC_COMPANY_NAME, MARGIN, y, {
        width: CONTENT_WIDTH * 0.52,
        characterSpacing: 0.8,
        lineBreak: false,
      });

    doc
      .font("Helvetica")
      .fontSize(28)
      .fillColor(INK)
      .text("I N V O I C E", MARGIN + CONTENT_WIDTH * 0.4, y - 4, {
        width: CONTENT_WIDTH * 0.6,
        align: "right",
        characterSpacing: 2,
        lineBreak: false,
      });

    y += 20;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(MUTED)
      .text(`On behalf of  ${freelancer.username}`, MARGIN, y, {
        width: CONTENT_WIDTH * 0.52,
        lineBreak: false,
      });

    y += 13;
    if (freelancerPhone) {
      doc.text(freelancerPhone, MARGIN, y, {
        width: CONTENT_WIDTH * 0.52,
        lineBreak: false,
      });
      y += 12;
    }
    if (freelancer.email?.trim()) {
      doc.text(freelancer.email.trim(), MARGIN, y, {
        width: CONTENT_WIDTH * 0.52,
        lineBreak: false,
      });
      y += 12;
    }

    const metaX = MARGIN + CONTENT_WIDTH * 0.52;
    const metaWidth = CONTENT_WIDTH * 0.48;
    let metaY = MARGIN + 36;
    const metaRows: Array<[string, string]> = [
      ["Issued date", format(issuedAt, "d MMM yyyy")],
      ["Due date", format(dueDate, "d MMM yyyy")],
      ["Invoice no", invoiceNo],
    ];

    for (const [label, value] of metaRows) {
      drawLabel(doc, label, metaX, metaY, { width: metaWidth * 0.42 });
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(INK)
        .text(value, metaX + metaWidth * 0.4, metaY - 1, {
          width: metaWidth * 0.6,
          align: "right",
          lineBreak: false,
        });
      metaY += 16;
    }

    y = Math.max(y, metaY) + 18;
    drawRule(doc, y, RULE_STRONG, 1);
    y += 22;

    // --- Bill to ---
    drawLabel(doc, "Bill to", MARGIN, y);
    y += 14;

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(INK)
      .text(booking.contact.name, MARGIN, y, { lineBreak: false });
    y += 16;

    doc.font("Helvetica").fontSize(9).fillColor(MUTED);
    if (billToLocation) {
      const locationLine =
        billToLocation.displayName?.trim() ||
        formatLocationAddress(billToLocation);
      doc.text(locationLine, MARGIN, y, {
        width: CONTENT_WIDTH * 0.7,
      });
      y += 12;
    }
    if (billToPhone) {
      doc.text(billToPhone, MARGIN, y, { lineBreak: false });
      y += 12;
    }

    y += 20;

    // --- Line items table ---
    const colItem = MARGIN;
    const colQty = MARGIN + CONTENT_WIDTH * 0.5;
    const colPrice = MARGIN + CONTENT_WIDTH * 0.64;
    const colTotal = MARGIN + CONTENT_WIDTH * 0.8;
    const colQtyW = CONTENT_WIDTH * 0.12;
    const colPriceW = CONTENT_WIDTH * 0.14;
    const colTotalW = CONTENT_WIDTH * 0.2;
    const rowPadY = 8;

    // Header strip
    doc.rect(MARGIN, y, CONTENT_WIDTH, 26).fill(WASH);
    drawLabel(doc, "Item", colItem + 10, y + 9);
    drawLabel(doc, "Qty", colQty, y + 9, { width: colQtyW, align: "right" });
    drawLabel(doc, "Price", colPrice, y + 9, {
      width: colPriceW,
      align: "right",
    });
    drawLabel(doc, "Total", colTotal, y + 9, {
      width: colTotalW - 10,
      align: "right",
    });
    y += 30;

    for (const [index, row] of lineRows.entries()) {
      const label = row.label.toUpperCase();
      doc.font("Helvetica").fontSize(10);
      const labelHeight = doc.heightOfString(label, {
        width: CONTENT_WIDTH * 0.46,
      });
      const rowHeight = Math.max(labelHeight, 12) + rowPadY * 2;

      if (index % 2 === 1) {
        doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill("#fafaf9");
      }

      const textY = y + rowPadY;
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(INK)
        .text(label, colItem + 10, textY, { width: CONTENT_WIDTH * 0.46 });
      doc.text(String(row.quantity), colQty, textY, {
        width: colQtyW,
        align: "right",
      });
      doc.text(formatRm(row.unitPriceRm), colPrice, textY, {
        width: colPriceW,
        align: "right",
      });
      doc
        .font("Helvetica-Bold")
        .text(formatRm(row.totalRm), colTotal, textY, {
          width: colTotalW - 10,
          align: "right",
        });

      y += rowHeight;
      drawRule(doc, y, RULE, 0.5);
    }

    y += 22;

    // --- Sessions + totals side by side ---
    const leftColWidth = CONTENT_WIDTH * 0.48;
    const rightColX = MARGIN + CONTENT_WIDTH * 0.52;
    const rightColWidth = CONTENT_WIDTH * 0.48;
    const sessionsStartY = y;
    let leftY = y;
    let rightY = y;

    drawLabel(doc, "Session", MARGIN, leftY);
    leftY += 14;

    for (const session of booking.sessions) {
      const sessionDate = toDate(session.date);
      if (!sessionDate) continue;

      const title = session.styleName?.trim() || session.name;
      const blockTop = leftY;
      const blockPad = 10;
      const lines = [
        title,
        format(sessionDate, "d/M/yyyy"),
        format(sessionDate, "EEEE"),
        `${formatTimeLabel(session.time_slot.startTime)} – ${formatTimeLabel(session.time_slot.endTime)}`,
      ];

      const blockHeight = blockPad * 2 + lines.length * 13;
      doc.rect(MARGIN, blockTop, leftColWidth, blockHeight).fill(WASH);
      doc.rect(MARGIN, blockTop, 3, blockHeight).fill(INK);

      let lineY = blockTop + blockPad;
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(INK)
        .text(lines[0], MARGIN + blockPad + 4, lineY, {
          width: leftColWidth - blockPad * 2 - 4,
        });
      lineY += 14;
      doc.font("Helvetica").fontSize(9).fillColor(MUTED);
      for (const line of lines.slice(1)) {
        doc.text(line, MARGIN + blockPad + 4, lineY, {
          width: leftColWidth - blockPad * 2 - 4,
          lineBreak: false,
        });
        lineY += 13;
      }
      leftY = blockTop + blockHeight + 10;
    }

    // Totals on the right
    const drawMoneyRow = (
      label: string,
      value: string,
      opts?: { strong?: boolean; muted?: boolean }
    ) => {
      doc
        .font(opts?.strong ? "Helvetica-Bold" : "Helvetica")
        .fontSize(opts?.strong ? 10 : 9)
        .fillColor(opts?.muted ? MUTED : INK)
        .text(label, rightColX, rightY, {
          width: rightColWidth * 0.55,
          align: "left",
          lineBreak: false,
        });
      doc.text(value, rightColX + rightColWidth * 0.45, rightY, {
        width: rightColWidth * 0.55,
        align: "right",
        lineBreak: false,
      });
      rightY += 16;
    };

    drawMoneyRow("Subtotal", formatRm(totalRm), { muted: true });
    drawMoneyRow("Total", formatRm(totalRm), { strong: true });
    rightY += 6;
    doc
      .strokeColor(RULE)
      .lineWidth(0.75)
      .moveTo(rightColX, rightY)
      .lineTo(PAGE_WIDTH - MARGIN, rightY)
      .stroke();
    rightY += 14;

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        `Paid on ${format(issuedAt, "d MMM yyyy")}`,
        rightColX,
        rightY,
        { width: rightColWidth * 0.55, lineBreak: false }
      );
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(INK)
      .text(formatRm(paidRm), rightColX + rightColWidth * 0.45, rightY, {
        width: rightColWidth * 0.55,
        align: "right",
        lineBreak: false,
      });
    rightY += 20;

    // Amount due highlight
    const dueBoxH = 34;
    doc.rect(rightColX, rightY, rightColWidth, dueBoxH).fill(INK);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#ffffff")
      .text("AMOUNT DUE", rightColX + 12, rightY + 12, {
        width: rightColWidth * 0.45,
        characterSpacing: 1,
        lineBreak: false,
      });
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor("#ffffff")
      .text(formatRm(balanceRm), rightColX + rightColWidth * 0.4, rightY + 10, {
        width: rightColWidth * 0.55 - 12,
        align: "right",
        lineBreak: false,
      });
    rightY += dueBoxH;

    y = Math.max(leftY, rightY, sessionsStartY) + 28;

    // --- Terms ---
    const termsPad = 14;
    const termsInnerW = CONTENT_WIDTH - termsPad * 2;
    doc.font("Helvetica-Bold").fontSize(8);
    const bannerH =
      doc.heightOfString(
        "ALL BOOKING FEE AMOUNT ARE STRICTLY NON-REFUNDABLE IN ANY CIRCUMSTANCES",
        { width: termsInnerW }
      ) + 4;
    doc.font("Helvetica").fontSize(8);
    const bodyH = doc.heightOfString(termsText, { width: termsInnerW });
    const termsBoxH = termsPad * 2 + bannerH + 8 + bodyH;

    doc.rect(MARGIN, y, CONTENT_WIDTH, termsBoxH).fill(WASH);
    doc.rect(MARGIN, y, CONTENT_WIDTH, termsBoxH).strokeColor(WASH_DARK).lineWidth(1).stroke();

    let termsY = y + termsPad;
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(INK)
      .text(
        "ALL BOOKING FEE AMOUNT ARE STRICTLY NON-REFUNDABLE IN ANY CIRCUMSTANCES",
        MARGIN + termsPad,
        termsY,
        { width: termsInnerW, characterSpacing: 0.3 }
      );
    termsY += bannerH + 6;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(MUTED)
      .text(termsText, MARGIN + termsPad, termsY, {
        width: termsInnerW,
        lineGap: 2,
      });

    // --- Footer ---
    const range = doc.bufferedPageRange();
    doc.switchToPage(range.start);
    drawRule(doc, FOOTER_Y - 16, RULE, 0.6);
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(FAINT)
      .text(registration, MARGIN, FOOTER_Y - 8, {
        width: CONTENT_WIDTH * 0.75,
        lineBreak: false,
      });
    doc.text("bridalync.com", PAGE_WIDTH - MARGIN - 120, FOOTER_Y - 8, {
      width: 120,
      align: "right",
      lineBreak: false,
    });

    doc.end();
  });
}

export function bookingInvoiceFilename(booking: PersistedBooking): string {
  const invoiceNo = invoiceNumberFromBookingId(String(booking._id));
  return `invoice-${invoiceNo}.pdf`;
}
