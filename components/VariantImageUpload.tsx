"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { IconPhoto, IconTrash, IconUpload } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type VariantImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  label?: string;
};

type CropSession = {
  objectUrl: string;
  fileName: string;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Could not load image for cropping."))
    );
    image.src = src;
  });
}

async function getCroppedImageFile(
  imageSrc: string,
  pixelCrop: Area,
  fileName: string
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not crop image.");
  }

  const outputSize = Math.min(pixelCrop.width, pixelCrop.height);
  canvas.width = outputSize;
  canvas.height = outputSize;

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Could not crop image."));
          return;
        }
        resolve(result);
      },
      "image/jpeg",
      0.92
    );
  });

  const baseName = fileName.replace(/\.[^/.]+$/, "") || "style-image";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

export function VariantImageUpload({
  value,
  onChange,
  disabled = false,
  label = "Image",
}: VariantImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSession, setCropSession] = useState<CropSession | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  function closeCropSession() {
    if (cropSession?.objectUrl) {
      URL.revokeObjectURL(cropSession.objectUrl);
    }
    setCropSession(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropSession((current) => {
      if (current?.objectUrl) {
        URL.revokeObjectURL(current.objectUrl);
      }
      return {
        objectUrl: URL.createObjectURL(file),
        fileName: file.name,
      };
    });
  }

  async function handleConfirmCrop() {
    if (!cropSession || !croppedAreaPixels) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const croppedFile = await getCroppedImageFile(
        cropSession.objectUrl,
        croppedAreaPixels,
        cropSession.fileName
      );

      const formData = new FormData();
      formData.append("file", croppedFile);
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
      closeCropSession();
    } catch (cropError) {
      setError(
        cropError instanceof Error
          ? cropError.message
          : "Could not crop image."
      );
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

      <Dialog
        open={cropSession !== null}
        onOpenChange={(open) => {
          if (!open && !uploading) {
            closeCropSession();
          }
        }}
      >
        <DialogContent
          className="z-60 sm:max-w-md"
          overlayClassName="z-60"
          showCloseButton={!uploading}
        >
          <DialogHeader>
            <DialogTitle>Crop image</DialogTitle>
            <DialogDescription>
              Drag to reposition. Aspect ratio is locked to 1:1.
            </DialogDescription>
          </DialogHeader>

          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
            {cropSession ? (
              <Cropper
                image={cropSession.objectUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="variant-image-zoom">Zoom</Label>
            <input
              id="variant-image-zoom"
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              disabled={uploading}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full accent-rose-800"
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-stretch">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={uploading}
              onClick={closeCropSession}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={uploading || !croppedAreaPixels}
              onClick={handleConfirmCrop}
            >
              {uploading ? "Uploading..." : "Apply crop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
