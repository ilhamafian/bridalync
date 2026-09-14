import { UPLOAD_IMAGE_MAX_BYTES } from "@/utils/image/constants";

const MAX_DIMENSION = 2048;

function replaceExtension(fileName: string, extension: string): string {
  const base = fileName.replace(/\.[^.]+$/, "") || "image";
  return `${base}.${extension}`;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    image.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not compress image."));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

/**
 * Compress an image in the browser before upload.
 * Needed because serverless hosts (e.g. Vercel) reject request bodies ~4.5 MB,
 * so a 17 MB phone/camera photo never reaches server-side compression.
 */
export async function compressImageFile(
  file: File,
  maxBytes = UPLOAD_IMAGE_MAX_BYTES
): Promise<File> {
  if (!file.type.startsWith("image/") && file.type !== "") {
    return file;
  }

  if (file.size <= maxBytes) {
    return file;
  }

  const image = await loadImageElement(file);
  const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
  let dimension = Math.min(longestEdge, MAX_DIMENSION);

  const sizeRatio = file.size / maxBytes;
  if (sizeRatio > 4) {
    dimension = Math.min(dimension, 1600);
  }
  if (sizeRatio > 8) {
    dimension = Math.min(dimension, 1280);
  }

  const scale = dimension / longestEdge;
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not compress image.");
  }

  context.drawImage(image, 0, 0, width, height);

  const outputType = "image/jpeg";
  let quality = 0.85;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const blob = await canvasToBlob(canvas, outputType, quality);
    if (blob.size <= maxBytes) {
      return new File([blob], replaceExtension(file.name, "jpg"), {
        type: outputType,
        lastModified: Date.now(),
      });
    }

    if (quality > 0.4) {
      quality -= 0.1;
      continue;
    }

    // Shrink canvas further and retry at mid quality
    const nextWidth = Math.max(320, Math.round(canvas.width * 0.75));
    const nextHeight = Math.max(320, Math.round(canvas.height * 0.75));
    const shrink = document.createElement("canvas");
    shrink.width = nextWidth;
    shrink.height = nextHeight;
    const shrinkCtx = shrink.getContext("2d");
    if (!shrinkCtx) {
      throw new Error("Could not compress image.");
    }
    shrinkCtx.drawImage(canvas, 0, 0, nextWidth, nextHeight);
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    context.drawImage(shrink, 0, 0);
    quality = 0.7;
  }

  const blob = await canvasToBlob(canvas, outputType, 0.35);
  return new File([blob], replaceExtension(file.name, "jpg"), {
    type: outputType,
    lastModified: Date.now(),
  });
}
