"use client";

import { CheckCircle2Icon, ImagePlusIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";

import { AnimatedFlow } from "@/components/animated-flow";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLocale } from "@/components/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { compressImageFile } from "@/utils/image/compressClient";
import { formatReviewEventDate, MAX_REVIEW_IMAGES } from "@/utils/reviews";

type ReviewContext = {
  clientName: string;
  freelancerName: string;
  packageNames: string;
  eventDate: string | null;
  reviewable: boolean;
  alreadyReviewed: boolean;
};

const frostedPanelClassName =
  "rounded-lg bg-white/30 p-4 shadow-sm ring-1 ring-white/60 backdrop-blur-sm dark:bg-white/10 dark:ring-white/15";

function ReviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <AnimatedFlow
        variant="blush"
        flowSpeed={0.9}
        distortionWarp={1.4}
        filmGrain={0.25}
        rotationAngle={120}
        className="pointer-events-none absolute inset-0 min-h-0"
      />
      <div className="pointer-events-none fixed top-4 right-6 z-50">
        <div className="pointer-events-auto">
          <LanguageSelector />
        </div>
      </div>
      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto overscroll-y-contain px-6 pt-16 pb-16">
        {children}
      </div>
    </div>
  );
}

function Message({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center py-16 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export default function BookingReviewPage() {
  const { t, format, intlLocale } = useLocale();
  const params = useParams();
  const client = params.client as string;
  const bookingId = params.bookingId as string;

  const [context, setContext] = useState<ReviewContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const remaining = MAX_REVIEW_IMAGES - imageUrls.length;
    if (remaining <= 0) {
      setSubmitError(format(t.reviewPhotoLimit, { max: MAX_REVIEW_IMAGES }));
      return;
    }

    setUploading(true);
    setSubmitError(null);
    try {
      for (const file of files.slice(0, remaining)) {
        const formData = new FormData();
        formData.append("file", await compressImageFile(file));
        formData.append("client", client);
        const response = await fetch(`/api/reviews/${bookingId}/images`, {
          method: "POST",
          body: formData,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || typeof data.url !== "string") {
          setSubmitError(
            typeof data.error === "string" ? data.error : t.reviewPhotoUploadFailed
          );
          break;
        }
        setImageUrls((prev) => [...prev, data.url].slice(0, MAX_REVIEW_IMAGES));
      }
    } catch {
      setSubmitError(t.reviewPhotoUploadFailed);
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `/api/reviews/${bookingId}?client=${encodeURIComponent(client)}`
        );
        if (!response.ok) {
          throw new Error(
            response.status === 404 ? t.bookingNotFound : t.couldNotLoadBooking
          );
        }
        const data = (await response.json()) as ReviewContext;
        if (!cancelled) setContext(data);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : t.couldNotLoadBooking
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [bookingId, client, t.bookingNotFound, t.couldNotLoadBooking]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!comment.trim()) {
      setSubmitError(t.reviewRequired);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch(`/api/reviews/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client,
          comment: comment.trim(),
          image_urls: imageUrls,
        }),
      });
      if (response.status === 409) {
        setContext((current) =>
          current ? { ...current, alreadyReviewed: true } : current
        );
        return;
      }
      if (!response.ok) throw new Error();
      setSubmitted(true);
    } catch {
      setSubmitError(t.reviewCouldNotSubmit);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <ReviewLayout>
        <Message>{t.loadingBooking}</Message>
      </ReviewLayout>
    );
  }

  if (loadError || !context) {
    return (
      <ReviewLayout>
        <Message>{loadError ?? t.couldNotLoadBooking}</Message>
      </ReviewLayout>
    );
  }

  const name = context.freelancerName;

  if (submitted || context.alreadyReviewed) {
    return (
      <ReviewLayout>
        <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 text-center">
          <CheckCircle2Icon className="size-12 text-rose-900 dark:text-rose-400" />
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t.reviewThanksTitle}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {submitted
              ? format(t.reviewThanksBody, { name })
              : t.reviewAlreadySubmitted}
          </p>
        </div>
      </ReviewLayout>
    );
  }

  if (!context.reviewable) {
    return (
      <ReviewLayout>
        <Message>{t.reviewNotAvailable}</Message>
      </ReviewLayout>
    );
  }

  const eventDate = formatReviewEventDate(
    context.eventDate ?? undefined,
    intlLocale
  );

  return (
    <ReviewLayout>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col gap-6"
      >
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {format(t.reviewTitle, { name })}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {format(t.reviewSubtitle, { name })}
          </p>
        </div>

        <div className={frostedPanelClassName}>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {context.packageNames}
          </p>
          <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            {format(t.reviewingAs, { name: context.clientName })}
            {eventDate ? ` · ${eventDate}` : ""}
          </p>
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={t.reviewPlaceholder}
            maxLength={2000}
            rows={6}
            className="mt-4 bg-white/60 dark:bg-white/5"
          />
          {imageUrls.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {imageUrls.map((url) => (
                <div
                  key={url}
                  className="relative size-20 overflow-hidden rounded-md ring-1 ring-white/60 dark:ring-white/15"
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                  <button
                    type="button"
                    aria-label={t.reviewRemovePhoto}
                    disabled={submitting || uploading}
                    onClick={() =>
                      setImageUrls((prev) => prev.filter((item) => item !== url))
                    }
                    className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-white/90 text-zinc-700 shadow-sm hover:text-rose-800"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 border-white/60 bg-white/40 hover:bg-white/60 dark:border-white/15 dark:bg-white/10"
            disabled={
              submitting || uploading || imageUrls.length >= MAX_REVIEW_IMAGES
            }
            onClick={() => imageInputRef.current?.click()}
          >
            <ImagePlusIcon />
            {uploading
              ? t.reviewUploadingPhotos
              : format(t.reviewAddPhotos, {
                  count: imageUrls.length,
                  max: MAX_REVIEW_IMAGES,
                })}
          </Button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
          {submitError ? (
            <p className="mt-2 text-xs text-destructive">{submitError}</p>
          ) : null}
        </div>

        <Button
          type="submit"
          disabled={submitting || uploading}
          className="h-11 w-full bg-rose-800 text-white hover:bg-rose-800/90"
        >
          {submitting ? t.reviewSubmitting : t.reviewSubmit}
        </Button>
      </form>
    </ReviewLayout>
  );
}
