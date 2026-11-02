"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";

import { Device } from "@/components/device";
import {
  FadeRise,
  RevealMask,
  revealEase,
  revealViewport,
  useAnimateOnScroll,
} from "@/components/landing/landing-reveal";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { cn } from "@/lib/utils";

const GLASS_SHADOW =
  "shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]";

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
    src: "/videos/dashboard.mp4",
  },
  {
    id: "payment",
    label: "Payment",
    title: "Know what you've earned",
    description:
      "Take deposits and full payments online or by transfer, approve receipts, and see your revenue and outstanding balances.",
      src: "/videos/payment.mp4",
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
  const animate = useAnimateOnScroll();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const phoneY = useTransform(scrollYProgress, [0, 0.4, 1], [78, 0, -24]);
  const phoneRotateY = useTransform(scrollYProgress, [0, 0.45], [14, 0]);
  const phoneScale = useTransform(scrollYProgress, [0, 0.4], [0.92, 1]);
  const phoneOpacity = useTransform(scrollYProgress, [0, 0.14], [0, 1]);
  const [selectedId, setSelectedId] = useState(teamFeatures[0].id);
  const selected =
    teamFeatures.find((feature) => feature.id === selectedId) ?? teamFeatures[0];

  return (
    <section
      ref={sectionRef}
      id="solution"
      className="scroll-mt-24 px-4 py-16 md:px-8 md:py-24"
    >
      <div className="mx-auto grid max-w-6xl items-stretch gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:gap-10">
        <div className="flex flex-col">
          <RevealMask>
            <h2 className="text-4xl font-semibold tracking-tight text-zinc-50 md:text-5xl">
              Meet the companion your business needs
            </h2>
          </RevealMask>
          <motion.div
            key={animate ? "motion" : "still"}
            role="group"
            aria-label="Glam Team Facing"
            className="mt-6 flex flex-wrap gap-2 md:w-2/3"
            initial={animate ? "hidden" : false}
            whileInView={animate ? "show" : undefined}
            viewport={revealViewport}
            variants={
              animate
                ? {
                    hidden: {},
                    show: { transition: { staggerChildren: 0.045, delayChildren: 0.16 } },
                  }
                : undefined
            }
          >
            {teamFeatures.map((feature) => {
              const active = feature.id === selected.id;
              return (
                <motion.button
                  key={feature.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedId(feature.id)}
                  variants={
                    animate
                      ? {
                          hidden: { opacity: 0, y: 12, scale: 0.92 },
                          show: {
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            transition: { duration: 0.45, ease: revealEase },
                          },
                        }
                      : undefined
                  }
                  className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <LiquidGlass
                    tint={active ? 0.32 : 0.16}
                    radius={999}
                    className={cn(
                      GLASS_SHADOW,
                      "text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100",
                      active && "ring-1 ring-white/70"
                    )}
                    contentClassName="whitespace-nowrap px-3 py-1.5 text-sm font-medium [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]"
                  >
                    {feature.label}
                  </LiquidGlass>
                </motion.button>
              );
            })}
          </motion.div>
          <FadeRise
            delay={0.28}
            y={22}
            className="mt-8 rounded-2xl bg-black/25 p-5 ring-1 ring-white/10 md:mt-auto md:mb-16 md:w-2/3 md:p-6"
          >
            <div aria-live="polite">
              <p className="text-xl font-semibold tracking-tight text-zinc-50 md:text-2xl">
                {selected.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400 md:text-base">
                {selected.description}
              </p>
            </div>
          </FadeRise>
        </div>

        <div className="flex items-center justify-center [perspective:1400px]">
          <motion.div
            key={animate ? "motion" : "still"}
            style={
              animate
                ? { y: phoneY, rotateY: phoneRotateY, scale: phoneScale, opacity: phoneOpacity }
                : undefined
            }
          >
            <Device
              finish="black"
              screenColor="#0b0609"
              shadowColor="#14040c"
              width="min(22rem, 78vw, calc((100svh - 10rem) / 2.092))"
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
          </motion.div>
        </div>
      </div>
    </section>
  );
}
