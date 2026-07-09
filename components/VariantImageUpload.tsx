"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { IconPhoto, IconTrash, IconUpload } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type VariantImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  label?: string;
};

export function VariantImageUpload({
  value,
  onChange,
  disabled = false,
  label = "Image",
}: VariantImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "style-images");

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not upload image."
        );
        return;
      }

      onChange(data.url);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>

      {value ? (
        <div className="flex items-center gap-3 rounded-lg border p-2">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
            <Image
              src={value}
              alt="Variant preview"
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="truncate text-xs text-muted-foreground">{value}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || uploading}
                onClick={() => inputRef.current?.click()}
              >
                <IconUpload />
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || uploading}
                onClick={() => onChange("")}
              >
                <IconTrash />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground transition-colors",
            "hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          <IconPhoto className="size-5" />
          <span>{uploading ? "Uploading..." : "Upload image"}</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
