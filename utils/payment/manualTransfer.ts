export const MANUAL_TRANSFER = {
  qrImagePath: "/payment-qr.jpeg",
  bankName: "Maybank",
  accountNumber: "5647 6237 5673",
  accountNumberDigits: "564762375673",
  payeeName: "Bridalync Services",
} as const;

export const RECEIPT_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const RECEIPT_MAX_SIZE_BYTES = 4 * 1024 * 1024;
