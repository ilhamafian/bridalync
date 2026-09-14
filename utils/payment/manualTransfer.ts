export const MANUAL_TRANSFER = {
  qrImagePath: "/payment-qr.jpeg",
  bankName: "Maybank",
  accountNumber: "5647 6237 5673",
  accountNumberDigits: "564762375673",
  payeeName: "Bridalync Services",
} as const;

export {
  UPLOAD_IMAGE_ALLOWED_TYPES as RECEIPT_ALLOWED_TYPES,
  UPLOAD_IMAGE_MAX_BYTES as RECEIPT_MAX_SIZE_BYTES,
} from "@/utils/image/upload";
