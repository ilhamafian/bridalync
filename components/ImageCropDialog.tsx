"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

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

type ImageCropDialogProps = {
  /** The picked file; null closes the dialog. */
  file: File | null;
  aspect?: number;
  title?: string;
  description?: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void | Promise<void>;
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

  canvas.width = Math.round(pixelCrop.width);
  canvas.height = Math.round(pixelCrop.height);

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height
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

  const baseName = fileName.replace(/\.[^/.]+$/, "") || "image";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

export function ImageCropDialog({
  file,
  aspect = 1,
  title = "Crop image",
  description = "Drag to reposition. Aspect ratio is locked to 1:1.",
  busy = false,
  error,
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropError, setCropError] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);

  useEffect(() => {
    if (!file) return;

    let cancelled = false;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (cancelled || typeof reader.result !== "string") return;
      setImageSrc(reader.result);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCropError(null);
    });
    reader.addEventListener("error", () => {
      if (!cancelled) setCropError("Could not load image for cropping.");
    });
    reader.readAsDataURL(file);

    return () => {
      cancelled = true;
      reader.abort();
    };
  }, [file]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const working = busy || cropping;

  async function handleConfirm() {
    if (!file || !imageSrc || !croppedAreaPixels) return;

    setCropping(true);
    setCropError(null);
    try {
      const croppedFile = await getCroppedImageFile(
        imageSrc,
        croppedAreaPixels,
        file.name
      );
      await onConfirm(croppedFile);
    } catch (confirmError) {
      setCropError(
        confirmError instanceof Error
          ? confirmError.message
          : "Could not crop image."
      );
    } finally {
      setCropping(false);
    }
  }

  const shownError = cropError ?? error;

  return (
    <Dialog
      open={file !== null}
      onOpenChange={(open) => {
        if (!open && !working) onCancel();
      }}
    >
      <DialogContent
        className="z-60 sm:max-w-md"
        overlayClassName="z-60"
        showCloseButton={!working}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
          {file && imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="image-crop-zoom">Zoom</Label>
          <input
            id="image-crop-zoom"
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            disabled={working}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="w-full accent-rose-800"
          />
        </div>

        {shownError ? (
          <p className="text-xs text-destructive">{shownError}</p>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-stretch">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={working}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={working || !croppedAreaPixels}
            onClick={() => void handleConfirm()}
          >
            {working ? "Uploading..." : "Apply crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
