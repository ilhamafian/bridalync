import {
  UPLOAD_IMAGE_ALLOWED_TYPES,
  UPLOAD_IMAGE_MAX_BYTES,
} from "@/utils/image/constants";

export { UPLOAD_IMAGE_ALLOWED_TYPES, UPLOAD_IMAGE_MAX_BYTES };

type CompressedImage = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

type Sharp = typeof import("sharp").default;

function extensionForContentType(contentType: string): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

function replaceFileExtension(fileName: string, extension: string): string {
  const base = fileName.replace(/\.[^.]+$/, "") || "image";
  return `${base}.${extension}`;
}

function outputFormatForMime(mimeType: string): {
  format: "jpeg" | "webp";
  contentType: "image/jpeg" | "image/webp";
} {
  if (mimeType === "image/jpeg") {
    return { format: "jpeg", contentType: "image/jpeg" };
  }

  return { format: "webp", contentType: "image/webp" };
}

async function loadSharp(): Promise<Sharp> {
  const mod = await import("sharp");
  return mod.default;
}

async function encodeImage(
  sharp: Sharp,
  input: Buffer,
  mimeType: string,
  dimension: number,
  quality: number
): Promise<Buffer> {
  const isGif = mimeType === "image/gif";
  const { format } = outputFormatForMime(mimeType);

  const pipeline = sharp(input, { animated: isGif })
    .rotate()
    .resize(dimension, dimension, {
      fit: "inside",
      withoutEnlargement: true,
    });

  if (format === "jpeg") {
    return pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
  }

  return pipeline.webp({ quality }).toBuffer();
}

export async function compressImageForUpload(
  input: Buffer,
  mimeType: string,
  maxBytes = UPLOAD_IMAGE_MAX_BYTES
): Promise<CompressedImage> {
  if (input.length <= maxBytes) {
    return {
      buffer: input,
      contentType: mimeType,
      extension: extensionForContentType(mimeType),
    };
  }

  const sharp = await loadSharp();
  const isGif = mimeType === "image/gif";
  const metadata = await sharp(input, { animated: isGif }).metadata();
  const longestEdge = Math.max(metadata.width ?? 4096, metadata.height ?? 4096);
  const sizeRatio = input.length / maxBytes;

  let dimension = longestEdge;
  if (sizeRatio > 4) {
    dimension = Math.min(dimension, 2048);
  }
  if (sizeRatio > 16) {
    dimension = Math.min(dimension, 1536);
  }
  if (sizeRatio > 64) {
    dimension = Math.min(dimension, 1024);
  }

  const { contentType } = outputFormatForMime(mimeType);
  let quality = 85;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const buffer = await encodeImage(
      sharp,
      input,
      mimeType,
      dimension,
      quality
    );

    if (buffer.length <= maxBytes) {
      return {
        buffer,
        contentType,
        extension: extensionForContentType(contentType),
      };
    }

    if (quality > 30) {
      quality -= 10;
      continue;
    }

    if (dimension > 512) {
      dimension = Math.max(512, Math.round(dimension * 0.75));
      quality = 80;
      continue;
    }

    if (quality > 15) {
      quality -= 5;
      continue;
    }

    dimension = Math.max(256, Math.round(dimension * 0.75));
    quality = 60;
  }

  const buffer = await encodeImage(sharp, input, mimeType, 256, 20);

  return {
    buffer,
    contentType,
    extension: extensionForContentType(contentType),
  };
}

export async function prepareFileForUpload(
  file: File,
  maxBytes = UPLOAD_IMAGE_MAX_BYTES
): Promise<{ data: Buffer; contentType: string; fileName: string }> {
  const input = Buffer.from(await file.arrayBuffer());

  try {
    const compressed = await compressImageForUpload(input, file.type, maxBytes);
    return {
      data: compressed.buffer,
      contentType: compressed.contentType,
      fileName: replaceFileExtension(file.name, compressed.extension),
    };
  } catch (error) {
    // Client should already have compressed below the host body limit.
    // If server-side sharp fails, still store the file when it fits.
    if (input.length <= maxBytes) {
      console.error("Image compress skipped after sharp failure:", error);
      return {
        data: input,
        contentType: file.type || "application/octet-stream",
        fileName: file.name,
      };
    }
    throw error;
  }
}
