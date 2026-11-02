"use client";

import { useState } from "react";

import { Device } from "@/components/device";
import { cn } from "@/lib/utils";

type Feature = {
  id: string;
  label: string;
  title: string;
  description: string;
  /** Public path, e.g. `/videos/client_booking.mp4`. Empty until the clip is added. */
  src?: string;
};

const teamFeatures: Feature[] = [
  {
    id: "client-booking",
    label: "Client Booking",
    title: "Bookings from your clients",
    description:
      "Your clients can book their own appointments online, and you'll receive a notification to confirm or reject.",
    src: "/videos/client_booking.mp4",
  },
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

export function LandingSolution() {
  const [selectedId, setSelectedId] = useState(teamFeatures[0].id);
  const selected =
    teamFeatures.find((feature) => feature.id === selectedId) ?? teamFeatures[0];

  return (
    <section id="solution" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto grid max-w-6xl items-stretch gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-10">
        <div className="flex flex-col">
          <h2 className="text-4xl font-semibold tracking-tight text-zinc-50 md:text-5xl">
            Glam Team Facing
          </h2>
          <div
            role="group"
            aria-label="Glam Team Facing"
            className="mt-6 flex flex-wrap gap-2"
          >
            {teamFeatures.map((feature) => {
              const active = feature.id === selected.id;
              return (
                <button
                  key={feature.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedId(feature.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-white/10 text-zinc-200 ring-1 ring-white/15 hover:bg-white/15"
                  )}
                >
                  {feature.label}
                </button>
              );
            })}
          </div>
          <div
            aria-live="polite"
            className="mt-8 rounded-2xl bg-black/25 p-5 ring-1 ring-white/10 md:mt-auto md:p-6"
          >
            <p className="text-xl font-semibold tracking-tight text-zinc-50 md:text-2xl">
              {selected.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400 md:text-base">
              {selected.description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center md:justify-start">
          <div className="rounded-[2.75rem] bg-black/25 p-4 ring-1 ring-white/10 md:p-6">
            <Device
              finish="black"
              screenColor="#0b0609"
              shadowColor="#14040c"
              width="min(24rem, 82vw)"
              rotateX={0}
              rotateY={0}
              rotateZ={0}
              float={0}
              drag={false}
              interactive={false}
              enableRotate={false}
              enableParallax={false}
              intro={false}
              island={false}
            >
              {selected.src ? (
                <video
                  key={selected.id}
                  src={selected.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                  aria-label={`Glam Team Facing: ${selected.label}`}
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center bg-[#0b0609] p-6 text-center text-sm text-zinc-400"
                  aria-label={`Glam Team Facing: ${selected.label}`}
                >
                  {selected.label}
                </div>
              )}
            </Device>
          </div>
        </div>
      </div>
    </section>
  );
}
