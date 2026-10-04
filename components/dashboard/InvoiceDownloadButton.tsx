"use client";

import { useState } from "react";
import { IconAlertCircle, IconDownload, IconLoader2 } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "ready" | "error";

/** iOS (incl. iPadOS, which reports as a Mac) has no download manager in standalone PWAs. */
function prefersShareSheet() {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

function filenameFromResponse(response: Response, fallback: string) {
  const header = response.headers.get("Content-Disposition") ?? "";
  return /filename="?([^";]+)"?/i.exec(header)?.[1] ?? fallback;
}

function saveWithLink(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isShareCancel(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function isShareBlocked(error: unknown) {
  return error instanceof DOMException && error.name === "NotAllowedError";
}

export function InvoiceDownloadButton({
  bookingId,
  invoiceNumber,
  label,
  className,
}: {
  bookingId: string;
  invoiceNumber?: string;
  /** Visible text; omit for an icon-only button. */
  label?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function share(file: File) {
    try {
      await navigator.share({ files: [file] });
      setPendingFile(null);
      setStatus("idle");
    } catch (shareError) {
      if (isShareCancel(shareError)) {
        setPendingFile(null);
        setStatus("idle");
        return;
      }
      if (isShareBlocked(shareError)) {
        // The PDF took too long and iOS dropped the tap; the next tap shares instantly.
        setPendingFile(file);
        setStatus("ready");
        return;
      }
      saveWithLink(file);
      setPendingFile(null);
      setStatus("idle");
    }
  }

  async function handleClick() {
    if (status === "loading") return;
    if (pendingFile) {
      await share(pendingFile);
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const response = await fetch(
        `/api/bookings/${encodeURIComponent(bookingId)}/invoice`
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Couldn't download the invoice."
        );
      }

      const blob = await response.blob();
      const file = new File(
        [blob],
        filenameFromResponse(
          response,
          `invoice-${invoiceNumber ?? bookingId}.pdf`
        ),
        { type: "application/pdf" }
      );

      if (prefersShareSheet() && navigator.canShare?.({ files: [file] })) {
        await share(file);
        return;
      }

      saveWithLink(file);
      setStatus("idle");
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Couldn't download the invoice."
      );
      setStatus("error");
    }
  }

  const description =
    status === "ready"
      ? "Invoice ready, tap to save"
      : status === "error"
        ? (error ?? "Couldn't download the invoice. Tap to retry.")
        : invoiceNumber
          ? `Download invoice #${invoiceNumber}`
          : "Download invoice";

  const icon =
    status === "loading" ? (
      <IconLoader2 className="size-4.5 animate-spin" />
    ) : status === "error" ? (
      <IconAlertCircle className="size-4.5 text-destructive" />
    ) : (
      <IconDownload className="size-4.5" />
    );

  return (
    <Button
      type="button"
      variant="ghost"
      size={label ? "sm" : "icon"}
      onClick={handleClick}
      disabled={status === "loading"}
      aria-label={description}
      title={description}
      className={cn(
        "shrink-0 rounded-full border border-zinc-900/10 bg-white/40 backdrop-blur-sm hover:bg-white/50 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15",
        label ? "h-8 gap-1.5 px-3 text-xs" : "size-10",
        status === "ready" && "ring-2 ring-primary/40",
        className
      )}
    >
      {icon}
      {label ? (
        <span>
          {status === "ready"
            ? "Tap to save"
            : status === "error"
              ? "Retry"
              : label}
        </span>
      ) : null}
    </Button>
  );
}
