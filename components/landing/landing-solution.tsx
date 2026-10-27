"use client";

import { useState } from "react";

import { landingGlassClassName } from "@/components/landing/glass";
import { cn } from "@/lib/utils";

type Feature = {
  id: string;
  label: string;
  title: string;
  description: string;
  /** Public path, e.g. `/landing/solution/client-booking.mp4`. Empty until the clip is added. */
  src?: string;
};

const clientFeatures: Feature[] = [
  {
    id: "client-booking",
    label: "Booking",
    title: "Clients book themselves",
    description:
      "Clients pick their event, date, time slot, style and venue, see the full price with travel fees, then pay a deposit. No back-and-forth on WhatsApp.",
  },
  {
    id: "review",
    label: "Review",
    title: "Reviews after every event",
    description:
      "Send a review link once the event is done. Clients leave a comment with photos, and it shows up on your public profile.",
  },
  {
    id: "edit",
    label: "Edit",
    title: "Changes without the chat",
    description:
      "Clients update their details or move their date from their booking page, and you're notified straight away.",
  },
  {
    id: "profile",
    label: "Profile",
    title: "One link for everything",
    description:
      "Your events, styles, reviews and availability on one page, ready to share in your Instagram bio and WhatsApp.",
  },
];

const teamFeatures: Feature[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    title: "Your day at a glance",
    description:
      "Today's sessions, booking requests, pending payments and recent activity, the moment you open the app.",
  },
  {
    id: "payment",
    label: "Payment",
    title: "Know what you've earned",
    description:
      "Take deposits and full payments online or by transfer, approve receipts, and see your revenue and outstanding balances.",
  },
  {
    id: "travel-fee",
    label: "Travel Fee",
    title: "Travel fees, worked out",
    description:
      "Charge by distance or by state. Every quotation adds the right travel fee for the venue automatically.",
  },
  {
    id: "hot-dates",
    label: "Hot Dates",
    title: "Price your peak dates",
    description:
      "Raise prices on popular dates by a fixed amount or a percentage, and clients see the right price when they book.",
  },
  {
    id: "block-dates",
    label: "Block Dates",
    title: "Block the days you're away",
    description:
      "Block whole days or single time slots so clients can't book when you're unavailable.",
  },
  {
    id: "team-booking",
    label: "Booking",
    title: "Add bookings yourself",
    description:
      "Got a booking from WhatsApp or a walk-in? Add it in seconds and send the client a payment link.",
  },
];

function FeaturePanel({
  title,
  features,
}: {
  title: string;
  features: Feature[];
}) {
  const [selectedId, setSelectedId] = useState(features[0].id);
  const selected =
    features.find((feature) => feature.id === selectedId) ?? features[0];

  return (
    <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_17rem] md:gap-16">
      <div className="flex flex-col gap-6">
        <h3 className="text-xl font-semibold tracking-tight text-zinc-900 md:text-2xl">
          {title}
        </h3>
        <div
          role="group"
          aria-label={title}
          className="grid grid-cols-4 gap-2"
        >
          {features.map((feature) => {
            const active = feature.id === selected.id;
            return (
              <button
                key={feature.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedId(feature.id)}
                className={cn(
                  "h-full w-full rounded-full px-2 py-2 text-center text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-sm",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-white/30 text-foreground shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"
                )}
              >
                {feature.label}
              </button>
            );
          })}
        </div>
        <div aria-live="polite" className="flex min-h-32 flex-col gap-2">
          <p className="text-2xl font-semibold tracking-tight text-rose-900 md:text-3xl">
            {selected.title}
          </p>
          <p className="max-w-lg text-base leading-relaxed text-zinc-700">
            {selected.description}
          </p>
        </div>
      </div>

      <div
        className={cn(
          landingGlassClassName,
          "mx-auto aspect-[9/16] w-full max-w-[17rem] overflow-hidden md:mx-0"
        )}
      >
        {selected.src ? (
          <video
            key={selected.id}
            src={selected.src}
            controls
            playsInline
            className="size-full bg-black/5 object-contain"
            aria-label={`${title}: ${selected.label}`}
          />
        ) : (
          <div
            className="flex size-full items-center justify-center p-6 text-center text-sm text-zinc-600"
            aria-label={`${title}: ${selected.label}`}
          >
            {selected.label}
          </div>
        )}
      </div>
    </div>
  );
}

export function LandingSolution() {
  return (
    <section
      id="solution"
      className="scroll-mt-24 px-4 py-16 md:px-8 md:py-24"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-16 md:gap-24">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
          Introducing Bridalync
        </h2>
        <FeaturePanel title="Client Facing" features={clientFeatures} />
        <FeaturePanel title="Glam Team Facing" features={teamFeatures} />
      </div>
    </section>
  );
}
