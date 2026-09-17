"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { IconPhoto, IconTrash, IconUpload } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { compressImageFile } from "@/utils/image/compressClient";

type PaymentQrUploadProps = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  /** Defaults to `/api/upload/image`. Onboarding uses `/api/onboarding/upload`. */
  uploadEndpoint?: string;
  /**
   * Sent as FormData `folder` when set.
   * Defaults to `payment-qr` for `/api/upload/image`.
   * Pass `null` to omit the folder field.
   */
  uploadFolder?: string | null;
  onUploadingChange?: (uploading: boolean) => void;
  onError?: (message: string | null) => void;
};

export function PaymentQrUpload({
  value,
  onChange,
  disabled = false,
  uploadEndpoint = "/api/upload/image",
  uploadFolder = "payment-qr",
  onUploadingChange,
  onError,
}: PaymentQrUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | null) {
    if (!file) return;
    onError?.(null);
    setUploading(true);
    onUploadingChange?.(true);

    try {
      const compressed = await compressImageFile(file);
      const formData = new FormData();
      formData.append("file", compressed);
      if (uploadFolder !== null) {
        formData.append("folder", uploadFolder);
      }

      const response = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || typeof data.url !== "string") {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Could not upload QR image."
        );
      }

      onChange(data.url);
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "Could not upload QR image."
      );
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Payment QR image</Label>
      <div
        className={cn(
          "flex flex-col gap-3 rounded-md border border-border p-3",
          disabled && "opacity-60"
        )}
      >
        {value ? (
          <div className="mx-auto w-full max-w-48 overflow-hidden rounded-md bg-white p-2">
            <Image
              src={value}
              alt="Payment QR"
              width={320}
              height={400}
              className="h-auto w-full object-contain"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
            <IconPhoto className="size-8" />
            <p className="text-sm">Upload the QR clients should scan</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(event) => {
            void handleFile(event.target.files?.[0] ?? null);
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            <IconUpload className="size-4" />
            {uploading ? "Uploading…" : value ? "Replace QR" : "Upload QR"}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => onChange("")}
            >
              <IconTrash className="size-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Use a clear photo or screenshot of your bank QR code.
      </p>
    </div>
  );
}
