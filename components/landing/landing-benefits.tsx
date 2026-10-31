import type { ReactNode } from "react";
import {
  IconCalendar,
  IconClock,
  IconMapPin,
  IconPhone,
  IconReceipt,
  IconSparkles,
  IconUser,
} from "@tabler/icons-react";

import { cn } from "@/lib/utils";

const cardClassName = "rounded-[1.6rem] bg-black/30 px-4 py-8 ring-1 ring-white/10 sm:px-5 sm:py-10";
const panelClassName = "rounded-2xl bg-black/55 p-3 ring-1 ring-white/10";

function Panel({
  icon: Icon,
  title,
  meta,
  children,
}: {
  icon: typeof IconCalendar;
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <div className={panelClassName}>
      <div className="flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/10">
          <Icon className="size-3.5 text-zinc-100" stroke={1.75} />
        </span>
        <p className="min-w-0 truncate text-sm font-medium text-zinc-50">{title}</p>
        {meta ? <p className="ml-auto shrink-0 text-[11px] text-zinc-500">{meta}</p> : null}
      </div>
      <div className="mt-3 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof IconCalendar;
  label: string;
  value: string;
  tone?: "neutral" | "good" | "due";
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="size-3.5 shrink-0 text-zinc-500" stroke={1.75} />
      <span className="min-w-0 flex-1 truncate text-zinc-400">{label}</span>
      <span
        className={cn(
          "shrink-0 rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-zinc-200",
          tone === "good" && "text-emerald-400",
          tone === "due" && "text-rose-300",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function DotRow({
  label,
  value,
  dot,
}: {
  label: string;
  value: string;
  dot: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={cn("size-1.5 shrink-0 rounded-full", dot)} />
      <span className="min-w-0 flex-1 truncate text-zinc-300">{label}</span>
      <span className="shrink-0 text-[11px] text-zinc-500">{value}</span>
    </div>
  );
}

const features = [
  {
    lead: "The booking comes to you.",
    body: "Clients choose the event, date, and time from your link, so you stop spending the day replying to availability messages.",
    panel: (
      <Panel icon={IconCalendar} title="Booking" meta="Today">
        <Field icon={IconUser} label="Ayra Helena" value="Confirmed" tone="good" />
        <Field icon={IconSparkles} label="Nikah & Sanding" value="Sanding" />
        <Field icon={IconClock} label="9:00 AM – 12:00 PM" value="Slot" />
        <Field icon={IconMapPin} label="JW Marriott" value="KL" />
      </Panel>
    ),
  },
  {
    lead: "The quotation is ready.",
    body: "Event price, deposit, travel fee, and the balance still due are calculated on the booking.",
    panel: (
      <Panel icon={IconReceipt} title="Quotation" meta="RM 2,480">
        <Field icon={IconSparkles} label="Event" value="RM 2,400" />
        <Field icon={IconReceipt} label="Deposit" value="Paid" tone="good" />
        <Field icon={IconMapPin} label="Travel fee" value="RM 80" />
        <Field icon={IconClock} label="Balance" value="RM 1,680" tone="due" />
      </Panel>
    ),
  },
  {
    lead: "Open slots stay bookable.",
    body: "Dates that are still free can be taken while you're with a bride, without you checking your calendar.",
    panel: (
      <Panel icon={IconClock} title="Saturday" meta="15 Nov">
        <DotRow label="8:00 AM" value="Booked" dot="bg-rose-400" />
        <DotRow label="11:00 AM" value="Open" dot="bg-emerald-400" />
        <DotRow label="2:00 PM" value="Open" dot="bg-emerald-400" />
        <DotRow label="5:00 PM" value="Blocked" dot="bg-zinc-500" />
      </Panel>
    ),
  },
  {
    lead: "Client details are already there.",
    body: "Phone, venue, and the time they need to be ready are saved with the booking.",
    panel: (
      <Panel icon={IconUser} title="Hana Sofea" meta="2 pax">
        <Field icon={IconPhone} label="Phone" value="+60 12 448 2190" />
        <Field icon={IconUser} label="Instagram" value="@hanasofea" />
        <Field icon={IconClock} label="Ready by" value="8:30 AM" />
        <Field icon={IconMapPin} label="Venue" value="The Ritz" />
      </Panel>
    ),
  },
];

export function LandingBenefits() {
  return (
    <section className="relative z-10 px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-x-8">
          <div className="flex flex-col gap-5 md:col-span-7 md:col-start-6">
            <h2 className="text-left text-4xl font-medium leading-[1.15] tracking-tight text-zinc-50 md:text-6xl">
              Everything your business needs to run, all in one place.
            </h2>
            <p className="text-left text-base leading-relaxed text-zinc-400 md:text-lg">
              Bridalync replaces scattered chats, spreadsheets, and manual admin with one platform built for galm teams. Manage your bookings, availability, quotations, and payments seamlessly, while keeping every client interaction organised from the first enquiry to the final appointment.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <div key={feature.lead} className="row-span-2 grid min-w-0 grid-rows-subgrid gap-y-4">
              <div className={cardClassName}>{feature.panel}</div>
              <p className="text-base leading-relaxed text-zinc-400">
                <span className="font-semibold text-zinc-50">{feature.lead}</span> {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
