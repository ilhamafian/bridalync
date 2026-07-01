export const MALAYSIAN_BANKS = [
  { value: "maybank", label: "Maybank" },
  { value: "cimb", label: "CIMB Bank" },
  { value: "public_bank", label: "Public Bank" },
  { value: "rhb", label: "RHB Bank" },
  { value: "bank_islam", label: "Bank Islam" },
  { value: "ambank", label: "AmBank" },
  { value: "hong_leong", label: "Hong Leong Bank" },
  { value: "uob", label: "UOB Malaysia" },
  { value: "ocbc", label: "OCBC Bank" },
  { value: "bank_rakyat", label: "Bank Rakyat" },
  { value: "alliance", label: "Alliance Bank" },
  { value: "standard_chartered", label: "Standard Chartered" },
  { value: "hsbc", label: "HSBC Malaysia" },
  { value: "affin", label: "Affin Bank" },
  { value: "bsn", label: "BSN" },
  { value: "bank_muamalat", label: "Bank Muamalat" },
  { value: "mbsb", label: "MBSB Bank" },
  { value: "agrobank", label: "Agrobank" },
  { value: "kfh", label: "Kuwait Finance House" },
] as const;

export type MalaysianBankValue = (typeof MALAYSIAN_BANKS)[number]["value"];
