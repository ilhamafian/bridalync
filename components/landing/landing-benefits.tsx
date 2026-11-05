"use client";

import type { ReactNode } from "react";
import { IconCreditCard, IconFileInvoice, IconQrcode } from "@tabler/icons-react";

import { FadeRise, RevealMask } from "@/components/landing/landing-reveal";
import { cn } from "@/lib/utils";

const cardClassName =
  "flex h-full flex-col justify-center rounded-[1.6rem] bg-black/30 px-4 py-8 ring-1 ring-white/10 sm:px-5 sm:py-10";
const panelClassName = "rounded-2xl bg-black/55 p-3.5 ring-1 ring-white/10";
const insetClassName = "rounded-xl bg-white/5 ring-1 ring-white/10";

function Status({
  children,
  tone = "good",
}: {
  children: ReactNode;
  tone?: "good" | "due";
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
        tone === "good" && "bg-emerald-400/15 text-emerald-300",
        tone === "due" && "bg-rose-400/15 text-rose-200",
      )}
    >
      {children}
    </span>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">{children}</p>
  );
}

function BookingPanel() {
  return (
    <div className={panelClassName} aria-hidden>
      <div className="flex items-center justify-between gap-2">
        <Kicker>New booking</Kicker>
        <Status>Confirmed</Status>
      </div>
      <p className="mt-2.5 truncate text-sm font-medium text-zinc-50">Ayra Helena</p>
      <p className="truncate text-xs text-zinc-400">Nikah & Sanding</p>
      <div className={cn(insetClassName, "mt-3 px-2.5 py-2")}>
        <p className="text-xs font-medium text-zinc-100">Sat, 15 Nov</p>
        <p className="mt-0.5 text-[11px] text-zinc-400">9:00 AM – 12:00 PM</p>
      </div>
      <p className="mt-2.5 truncate text-[11px] text-zinc-500">JW Marriott, KL</p>
    </div>
  );
}

function PayChip({
  icon: Icon,
  label,
}: {
  icon: typeof IconQrcode;
  label: string;
}) {
  return (
    <div className={cn(insetClassName, "flex min-w-0 items-center gap-1.5 px-2 py-1.5")}>
      <Icon className="size-3.5 shrink-0 text-zinc-200" stroke={1.75} />
      <span className="truncate text-[11px] text-zinc-200">{label}</span>
    </div>
  );
}

function PaymentPanel() {
  return (
    <div className={panelClassName} aria-hidden>
      <div className="flex items-center justify-between gap-2">
        <Kicker>Deposit</Kicker>
        <Status>Paid</Status>
      </div>
      <p className="mt-2 text-lg font-medium tracking-tight text-zinc-50 tabular-nums">RM 800</p>
      <p className="truncate text-xs text-zinc-400">Ayra Helena · Nikah</p>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <PayChip icon={IconQrcode} label="QR code" />
        <PayChip icon={IconCreditCard} label="Gateway" />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px]">
        <span className="text-zinc-500">Balance</span>
        <span className="font-medium text-rose-200 tabular-nums">RM 1,680</span>
      </div>
    </div>
  );
}

function CalendarPanel() {
  return (
    <div className={panelClassName} aria-hidden>
      <div className="flex items-center justify-between gap-2">
        <Kicker>Google Calendar</Kicker>
        <Status>Synced</Status>
      </div>
      <p className="mt-2.5 text-sm font-medium text-zinc-50">Saturday, 15 Nov</p>
      <div className={cn(insetClassName, "mt-3 flex gap-2 px-2.5 py-2")}>
        <span className="w-0.5 shrink-0 rounded-full bg-rose-400" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-100">9:00 AM – 12:00 PM</p>
          <p className="truncate text-[11px] text-zinc-400">Ayra Helena</p>
          <p className="truncate text-[11px] text-zinc-500">Nikah & Sanding</p>
        </div>
      </div>
      <p className="mt-2.5 text-[11px] text-zinc-500">Added automatically</p>
    </div>
  );
}

function RevenuePanel() {
  return (
    <div className={panelClassName} aria-hidden>
      <div className="flex items-center justify-between gap-2">
        <Kicker>November</Kicker>
        <span className="text-[10px] text-zinc-500">This month</span>
      </div>
      <p className="mt-2 text-lg font-medium tracking-tight text-zinc-50 tabular-nums">RM 18,400</p>
      <svg
        viewBox="0 0 140 48"
        className="mt-2 h-9 w-full"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0 40 L24 36 L48 30 L72 22 L96 16 L120 8 L140 4 V48 H0 Z"
          fill="rgb(251 113 133 / 0.28)"
        />
        <path
          d="M0 40 L24 36 L48 30 L72 22 L96 16 L120 8 L140 4"
          fill="none"
          stroke="rgb(253 164 175)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className={cn(insetClassName, "mt-2 flex items-center gap-2 px-2.5 py-2")}>
        <IconFileInvoice className="size-3.5 shrink-0 text-zinc-300" stroke={1.75} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-zinc-100">Hana Sofea</p>
          <p className="text-[11px] text-zinc-500">Invoice emailed</p>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    lead: "The booking comes to you.",
    body: "Clients choose the event, date, and time from your link, so you stop spending the day replying to availability messages.",
    panel: <BookingPanel />,
  },
  {
    lead: "Payments are easier to manage.",
    body: "Add a payment gateway or QR code to your booking page so clients can pay directly. Stop chasing payments & spend more time doing what you love.",
    panel: <PaymentPanel />,
  },
  {
    lead: "Your calendar stays in sync.",
    body: "Every new booking is automatically added to your Google Calendar, without having to enter appointments manually.",
    panel: <CalendarPanel />,
  },
  {
    lead: "Revenue and invoices, sorted.",
    body: "Track your monthly earnings automatically. Invoices are generated and emailed to clients. No more editing invoices in another apps!",
    panel: <RevenuePanel />,
  },
];

export function LandingBenefits() {
  return (
    <section className="relative z-10 px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-x-8">
          <div className="flex flex-col gap-5 md:col-span-7 md:col-start-6">
            <RevealMask>
              <h2 className="text-left text-4xl font-medium leading-[1.15] tracking-tight text-zinc-50 md:text-6xl">
                Everything your business needs to run, all in one place.
              </h2>
            </RevealMask>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, index) => (
            <div key={feature.lead} className="row-span-2 grid min-w-0 grid-rows-subgrid gap-y-4">
              <FadeRise
                delay={index * 0.08}
                y={52}
                scale={0.94}
                rotate={index % 2 === 0 ? 2.5 : -2.5}
                className="h-full origin-bottom"
              >
                <div className={cardClassName}>{feature.panel}</div>
              </FadeRise>
              <FadeRise delay={0.16 + index * 0.08} y={18}>
                <p className="text-base leading-relaxed text-zinc-400">
                  <span className="font-semibold text-zinc-50">{feature.lead}</span> {feature.body}
                </p>
              </FadeRise>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
