"use client";

import Image from "next/image";
import type { ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { PublicReview } from "@/schemas/reviewSchema";
import type { PublicProfile } from "@/schemas/userSchema";
import { formatReviewEventDate } from "@/utils/reviews";
import {
  buildWhatsAppProfileUrl,
  socialLinksWithUrls,
} from "@/utils/socialLinks";

const roleLabel: Record<"hijabstylist" | "makeupartist", string> = {
  hijabstylist: "Hijab stylist",
  makeupartist: "Makeup artist",
};

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
  const displayName = user.name?.trim() || user.username || "Stylist";
  const role = user.role ? roleLabel[user.role] : null;
  const socialEntries = buildSocialEntries(user);

  return (
    <Card className="mx-auto w-full max-w-md min-w-72 shrink-0 overflow-visible [--card-spacing:--spacing(6)] sm:min-w-80">
      <CardContent className="flex flex-col gap-8 pt-(--card-spacing)">
        <div className="flex items-center gap-4">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            {user.profile_photo_url ? (
              <Image
                src={user.profile_photo_url}
                alt={displayName}
                fill
                className="object-cover"
                sizes="96px"
                priority
              />
            ) : (
              <div className="flex size-full items-center justify-center text-xl font-semibold text-zinc-500 dark:text-zinc-400">
                {initialsFromName(displayName)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {displayName}
            </h1>
            {role ? (
              <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                {role}
              </p>
            ) : null}
            <Button
              type="button"
              size="lg"
              className="mt-3 h-10 w-full bg-chart-4 text-white hover:bg-chart-4/90 sm:w-auto"
              onClick={onBookNow}
            >
              Book now
            </Button>
          </div>
        </div>

        {socialEntries.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            {socialEntries.map(({ key, label, href, icon: Icon }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="inline-flex size-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:border-zinc-500"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        ) : null}

        <section className="flex flex-col gap-4">
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
            <ul className="flex flex-col gap-4">
              {reviews.map((review) => (
                <li
                  key={review._id}
                  className="border-b border-zinc-200 pb-4 last:border-b-0 last:pb-0 dark:border-zinc-800"
                >
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">
                    {review.clientName}
                  </p>
                  {review.event_date ? (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                      {formatReviewEventDate(review.event_date)}
                    </p>
                  ) : null}
                  {review.comment ? (
                    <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                      {review.comment}
                    </p>
                  ) : null}
                  {(review.image_urls?.length ?? 0) > 0 ? (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {review.image_urls.map((url) => (
                        <div
                          key={url}
                          className="relative size-20 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800"
                        >
                          <Image
                            src={url}
                            alt={`${review.clientName} review photo`}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
