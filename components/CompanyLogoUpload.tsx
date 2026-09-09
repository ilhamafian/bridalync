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

const LOGO_ASPECT = 16 / 9;

type CompanyLogoUploadProps = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  label?: string;
  /** Defaults to `/api/upload/image`. Onboarding uses `/api/onboarding/upload`. */
  uploadEndpoint?: string;
  /**
   * Sent as FormData `folder` when set.
   * Defaults to `company-logos` for `/api/upload/image`.
   * Pass `null` to omit the folder field (onboarding upload).
   */
  uploadFolder?: string | null;
  onUploadingChange?: (uploading: boolean) => void;
  onError?: (message: string | null) => void;
  hint?: string;
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

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
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

  const baseName = fileName.replace(/\.[^/.]+$/, "") || "company-logo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

export function CompanyLogoUpload({
  value,
  onChange,
  disabled = false,
  label = "Company logo",
  uploadEndpoint = "/api/upload/image",
  uploadFolder = "company-logos",
  onUploadingChange,
  onError,
  hint,
}: CompanyLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSession, setCropSession] = useState<CropSession | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const reportError = useCallback(
    (message: string | null) => {
      setError(message);
      onError?.(message);
    },
    [onError]
  );

  const setUploadingState = useCallback(
    (next: boolean) => {
      setUploading(next);
      onUploadingChange?.(next);
    },
    [onUploadingChange]
  );

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

    if (!file.type.startsWith("image/")) {
      reportError("Choose an image file.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      reportError("Image must be 4 MB or smaller.");
      return;
    }

    reportError(null);
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

    setUploadingState(true);
    reportError(null);

    try {
      const croppedFile = await getCroppedImageFile(
        cropSession.objectUrl,
        croppedAreaPixels,
        cropSession.fileName
      );

      const formData = new FormData();
      formData.append("file", croppedFile);
      if (uploadFolder != null && uploadFolder.length > 0) {
        formData.append("folder", uploadFolder);
      }

      const response = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        reportError(
          typeof data.error === "string"
            ? data.error
            : "Could not upload logo."
        );
        return;
      }

      if (typeof data.url !== "string") {
        reportError("Could not upload logo.");
        return;
      }

      onChange(data.url);
      closeCropSession();
    } catch (cropError) {
      reportError(
        cropError instanceof Error
          ? cropError.message
          : "Could not crop image."
      );
    } finally {
      setUploadingState(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {label ? <Label>{label}</Label> : null}

      {value ? (
        <div className="flex items-center gap-3 rounded-lg border p-2">
          <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-muted">
            <Image
              src={value}
              alt="Company logo"
              fill
              className="object-cover"
              sizes="112px"
            />
          </div>
          <div className="flex flex-1 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              <IconUpload className="size-4" />
              Change
            </Button>
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
          <span>{uploading ? "Uploading…" : "Upload logo"}</span>
        </button>
      )}

      {hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}

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
          className="z-60 sm:max-w-lg"
          overlayClassName="z-60"
          showCloseButton={!uploading}
        >
          <DialogHeader>
            <DialogTitle>Crop logo</DialogTitle>
            <DialogDescription>
              Drag to reposition. Aspect ratio is locked to 16:9.
            </DialogDescription>
          </DialogHeader>

          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
            {cropSession ? (
              <Cropper
                image={cropSession.objectUrl}
                crop={crop}
                zoom={zoom}
                aspect={LOGO_ASPECT}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                objectFit="contain"
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="company-logo-zoom">Zoom</Label>
            <input
              id="company-logo-zoom"
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
              {uploading ? "Uploading…" : "Apply crop"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
