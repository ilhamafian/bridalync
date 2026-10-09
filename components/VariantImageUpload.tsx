"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { IconPhoto, IconTrash, IconUpload } from "@tabler/icons-react";

import { ImageCropDialog } from "@/components/ImageCropDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { compressImageFile } from "@/utils/image/compressClient";

type VariantImageUploadProps = {
  value: string[];
  onChange: (urls: string[]) => void;
  /** 1 = a single replaceable image; more = a grid that grows up to `max`. */
  max?: number;
  disabled?: boolean;
  label?: string;
};

export function VariantImageUpload({
  value,
  onChange,
  max = 1,
  disabled = false,
  label = max > 1 ? "Images" : "Image",
}: VariantImageUploadProps) {
  const single = max <= 1;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setError(null);
    setCropFile(file);
  }

  async function handleConfirmCrop(croppedFile: File) {
    setUploading(true);
    setError(null);

    try {
      const prepared = await compressImageFile(croppedFile);

      const formData = new FormData();
      formData.append("file", prepared);
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

      onChange(single ? [data.url] : [...value, data.url].slice(0, max));
      setCropFile(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>
        {label}
        {single ? null : (
          <span className="font-normal text-muted-foreground">
            {" "}
            ({value.length}/{max})
          </span>
        )}
      </Label>

      {!single ? (
        <div className="grid grid-cols-3 gap-2">
          {value.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              <Image
                src={url}
                alt={`Image ${index + 1}`}
                fill
                className="object-cover"
                sizes="120px"
              />
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                className="absolute top-1 right-1 size-7 rounded-full bg-white/90"
                disabled={disabled || uploading}
                onClick={() =>
                  onChange(value.filter((_, itemIndex) => itemIndex !== index))
                }
                aria-label={`Remove image ${index + 1}`}
              >
                <IconTrash />
              </Button>
            </div>
          ))}
          {value.length < max ? (
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed bg-muted/20 px-2 text-xs text-muted-foreground transition-colors",
                "hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-50"
              )}
            >
              <IconPhoto className="size-5" />
              <span>{uploading ? "Uploading..." : "Add image"}</span>
            </button>
          ) : null}
        </div>
      ) : value[0] ? (
        <div className="flex items-center gap-3 rounded-lg border p-2">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
            <Image
              src={value[0]}
              alt="Variant preview"
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="truncate text-xs text-muted-foreground">{value[0]}</p>
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
                onClick={() => onChange([])}
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

      {error && !cropFile ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}

      <ImageCropDialog
        file={cropFile}
        busy={uploading}
        error={error}
        onCancel={() => {
          setCropFile(null);
          setError(null);
        }}
        onConfirm={handleConfirmCrop}
      />
    </div>
  );
}
