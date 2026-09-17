"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ManualTransferDetails } from "@/schemas/settingSchema";
import { compressImageFile } from "@/utils/image/compressClient";

type ManualPaymentStepProps = {
  amountLabel: string;
  submitLabel: string;
  submittingLabel?: string;
  isSubmitting?: boolean;
  error?: string | null;
  transfer: ManualTransferDetails;
  onSubmit: (receipt: File) => void | Promise<void>;
  className?: string;
};

export function ManualPaymentStep({
  amountLabel,
  submitLabel,
  submittingLabel = "Submitting…",
  isSubmitting = false,
  error = null,
  transfer,
  onSubmit,
  className,
}: ManualPaymentStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  function handleFileChange(file: File | null) {
    setLocalError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setReceipt(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function handleSubmit() {
    if (!receipt) {
      setLocalError("Upload your payment receipt to continue.");
      return;
    }
    try {
      const compressed = await compressImageFile(receipt);
      await onSubmit(compressed);
    } catch {
      setLocalError("Could not prepare receipt image. Try another photo.");
    }
  }

  const displayError = localError || error;

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <div className="rounded-lg bg-white/30 p-4 shadow-sm ring-1 ring-white/60 backdrop-blur-sm dark:bg-white/10 dark:ring-white/15">
        <p className="mb-3 text-center text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {amountLabel}
        </p>
        <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            Transfer to{" "}
            <span className="font-medium">{transfer.payeeName}</span> via QR,
            or transfer to account{" "}
            <span className="font-mono font-medium">
              {transfer.accountNumber}
            </span>{" "}
            ({transfer.bankName}).
          </li>
          <li>Upload a clear photo or screenshot of your payment receipt.</li>
        </ol>
        <div className="mx-auto mb-2 w-full max-w-55 overflow-hidden rounded-lg bg-white p-3 shadow-sm">
          <Image
            src={transfer.qrImageUrl}
            alt={`${transfer.payeeName} payment QR`}
            width={400}
            height={500}
            className="h-auto w-full object-contain"
            priority
            unoptimized
          />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {transfer.bankName} · {transfer.accountNumber}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="payment-receipt">Payment receipt</Label>
        <input
          ref={inputRef}
          id="payment-receipt"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-rose-800 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            handleFileChange(file);
          }}
        />
        {previewUrl ? (
          <div className="relative mt-1 aspect-video w-full overflow-hidden rounded-md border border-border bg-muted/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="h-full w-full object-contain"
            />
          </div>
        ) : null}
      </div>

      {displayError ? (
        <p className="text-sm text-destructive" role="alert">
          {displayError}
        </p>
      ) : null}

      <Button
        size="lg"
        className="h-11 w-full bg-rose-800 text-white hover:bg-rose-800/90"
        disabled={isSubmitting}
        onClick={() => void handleSubmit()}
      >
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </div>
  );
}
