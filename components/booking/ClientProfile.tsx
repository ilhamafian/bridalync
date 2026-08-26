"use client";

import Image from "next/image";
import { XIcon } from "lucide-react";
import { useEffect, useRef, useState, type ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PublicReview } from "@/schemas/reviewSchema";
import type { PublicProfile } from "@/schemas/userSchema";
import { formatReviewEventDate } from "@/utils/reviews";
import {
  buildWhatsAppProfileUrl,
  socialLinksWithUrls,
} from "@/utils/socialLinks";

const roleLabel: Record<"hijabstylist" | "makeupartist", string> = {
  hijabstylist: "Hijab Stylist",
  makeupartist: "Makeup Artist",
};

/** Portrait fallback used until the opened photo reports its real dimensions. */
const DEFAULT_PHOTO_RATIO = 3 / 4;

function BrandIcon({
  paths,
  className,
}: {
  paths: string[];
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      {paths.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <BrandIcon
      className={className}
      paths={[
        "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6m9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
      ]}
    />
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <BrandIcon
      className={className}
      paths={[
        "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.3a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.18 8.18 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15Z",
      ]}
    />
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <BrandIcon
      className={className}
      paths={[
        "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z",
      ]}
    />
  );
}

type SocialEntry = {
  key: string;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function buildSocialEntries(user: PublicProfile): SocialEntry[] {
  const socialUrls = socialLinksWithUrls(user.social_links);
  const entries: SocialEntry[] = [];

  for (const key of ["instagram", "tiktok"] as const) {
    const href = socialUrls[key];
    if (!href) continue;
    entries.push({
      key,
      label: key === "instagram" ? "Instagram" : "TikTok",
      href,
      icon: key === "instagram" ? InstagramIcon : TikTokIcon,
    });
  }

  const whatsappUrl = buildWhatsAppProfileUrl(user.country_code, user.mobile);
  if (whatsappUrl) {
    entries.push({
      key: "whatsapp",
      label: "WhatsApp",
      href: whatsappUrl,
      icon: WhatsAppIcon,
    });
  }

  return entries;
}

type ClientProfileProps = {
  user: PublicProfile;
  reviews: PublicReview[];
  onBookNow: () => void;
};

export function ClientProfile({
  user,
  reviews,
  onBookNow,
}: ClientProfileProps) {
  const [selectedReview, setSelectedReview] = useState<PublicReview | null>(
    null
  );
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState(DEFAULT_PHOTO_RATIO);
  const lightboxClosedAtRef = useRef(0);
  const displayName = user.name?.trim() || user.username || "Stylist";
  const role = user.role ? roleLabel[user.role] : null;
  const socialEntries = buildSocialEntries(user);

  function openLightbox(url: string) {
    setImageAspectRatio(DEFAULT_PHOTO_RATIO);
    setSelectedImageUrl(url);
  }

  function closeLightbox() {
    lightboxClosedAtRef.current = Date.now();
    setSelectedImageUrl(null);
  }

  /**
   * Radix falls back to a deferred `click` for outside-dismissal on touch, which
   * lands after the lightbox is already closed — hence the grace period.
   */
  function shouldKeepReviewOpen() {
    return (
      selectedImageUrl !== null ||
      Date.now() - lightboxClosedAtRef.current < 500
    );
  }

  useEffect(() => {
    if (!selectedImageUrl) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeLightbox();
      }
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [selectedImageUrl]);

  return (
    <div className="mx-auto flex w-full max-w-md min-w-72 shrink-0 flex-col gap-10 sm:min-w-80">
      <div className="flex flex-col items-center text-center">
        <div className="relative size-28 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          {user.profile_photo_url ? (
            <Image
              src={user.profile_photo_url}
              alt={displayName}
              fill
              className="object-cover"
              sizes="112px"
              priority
            />
          ) : (
            <div className="flex size-full items-center justify-center text-2xl font-semibold text-zinc-500 dark:text-zinc-400">
              {initialsFromName(displayName)}
            </div>
          )}
        </div>

        <h1 className="mt-5 max-w-full truncate text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {displayName}
        </h1>
        {role ? (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{role}</p>
        ) : null}

        <Button
          type="button"
          size="lg"
          className="mt-6 h-11 w-full max-w-xs bg-chart-4 text-white hover:bg-chart-4/90"
          onClick={onBookNow}
        >
          Book Now
        </Button>

        {socialEntries.length > 0 ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {socialEntries.map(({ key, label, href, icon: Icon }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <section className="mx-auto flex w-full max-w-xs flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Reviews
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Client feedback and work photos.
          </p>
        </div>

        {reviews.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            No reviews yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {reviews.map((review) => (
              <li key={review._id}>
                <button
                  type="button"
                  className="w-full rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setSelectedReview(review)}
                >
                  <Card
                    size="sm"
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  >
                    <CardContent className="flex flex-col gap-2">
                      <div>
                        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                          {review.clientName}
                        </p>
                        {review.event_date ? (
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                            {formatReviewEventDate(review.event_date)}
                          </p>
                        ) : null}
                      </div>
                      {review.comment ? (
                        <p className="line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {review.comment}
                        </p>
                      ) : null}
                      {(review.image_urls?.length ?? 0) > 0 ? (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {review.image_urls.map((url) => (
                            <div
                              key={url}
                              className="relative size-36 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800"
                            >
                              <Image
                                src={url}
                                alt={`${review.clientName} review photo`}
                                fill
                                className="object-cover"
                                sizes="144px"
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={selectedReview !== null}
        onOpenChange={(open) => {
          if (!open) {
            if (shouldKeepReviewOpen()) return;
            setSelectedReview(null);
          }
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
          onPointerDownOutside={(event) => {
            if (shouldKeepReviewOpen()) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (shouldKeepReviewOpen()) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (shouldKeepReviewOpen()) event.preventDefault();
          }}
        >
          {selectedReview ? (
            <>
              <DialogHeader className="pr-8">
                <DialogTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  {selectedReview.clientName}
                </DialogTitle>
                {selectedReview.event_date ? (
                  <DialogDescription>
                    {formatReviewEventDate(selectedReview.event_date)}
                  </DialogDescription>
                ) : (
                  <DialogDescription className="sr-only">
                    Review details
                  </DialogDescription>
                )}
              </DialogHeader>

              {selectedReview.comment ? (
                <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {selectedReview.comment}
                </p>
              ) : null}

              {(selectedReview.image_urls?.length ?? 0) > 0 ? (
                <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                  {selectedReview.image_urls.map((url) => (
                    <button
                      key={url}
                      type="button"
                      className="relative h-72 w-56 shrink-0 overflow-hidden rounded-lg bg-zinc-100 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring dark:bg-zinc-800"
                      onClick={() => openLightbox(url)}
                      aria-label={`View full size photo from ${selectedReview.clientName}`}
                    >
                      <Image
                        src={url}
                        alt={`${selectedReview.clientName} review photo`}
                        fill
                        className="object-cover"
                        sizes="256px"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {selectedImageUrl ? (
        <div
          className="pointer-events-auto fixed inset-0 z-60 flex cursor-zoom-out items-center justify-center bg-black/90 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Full size review photo"
          onClick={closeLightbox}
        >
          <div
            className="relative cursor-default overflow-hidden rounded-2xl"
            style={{
              width: `min(90vw, calc(80vh * ${imageAspectRatio}))`,
              aspectRatio: imageAspectRatio,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={selectedImageUrl}
              alt={
                selectedReview
                  ? `${selectedReview.clientName} review photo`
                  : "Review photo"
              }
              fill
              className="object-cover"
              sizes="90vw"
              priority
              onLoad={(event) => {
                const { naturalWidth, naturalHeight } = event.currentTarget;
                if (naturalWidth > 0 && naturalHeight > 0) {
                  setImageAspectRatio(naturalWidth / naturalHeight);
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Close photo"
              className="absolute top-2 right-2 rounded-full bg-black/60 text-zinc-50 hover:bg-black/80 hover:text-zinc-50"
              onClick={closeLightbox}
            >
              <XIcon />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
