import {
  IconBell,
  IconBrandInstagram,
  IconCalendarQuestion,
  IconCash,
  IconCheck,
  IconHome,
  IconMapPin,
  IconNavigation,
  IconPlus,
  IconReceipt,
  IconSearch,
  IconSettings,
  IconUser,
  IconX,
} from "@tabler/icons-react";

import { AnimatedFlow } from "@/components/animated-flow";
import { cn } from "@/lib/utils";

const glassCardClassName =
  "rounded-2xl bg-white/10 shadow-sm ring-1 ring-white/15 backdrop-blur-sm";

/** Dark blush palette from AnimatedFlow, used directly so the preview stays dark on the marketing page. */
const DARK_BLUSH = ["#0b0609", "#160c11", "#24121b", "#341a27", "#4a2536"];

function Pill({
  children,
  tone = "outline",
}: {
  children: React.ReactNode;
  tone?: "solid" | "outline";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[0.625rem] font-medium",
        tone === "solid"
          ? "bg-rose-800 text-white"
          : "border border-white/15 bg-white/10 text-zinc-200"
      )}
    >
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-medium text-zinc-100">{children}</h3>;
}

export function LandingDashboardPreview({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="Sample Bridalync dashboard with today's bookings, a booking request, and recent activity"
      className={cn(
        "relative h-full w-full overflow-hidden text-zinc-50",
        className
      )}
    >
      <AnimatedFlow
        variant="blush"
        colors={DARK_BLUSH}
        vignetteStrength={0.45}
        flowSpeed={0.9}
        distortionWarp={1.4}
        filmGrain={0.25}
        rotationAngle={120}
        interactive={false}
        className="pointer-events-none absolute inset-0 h-full min-h-0"
      />

      <div className="absolute inset-x-0 top-[10cqmin] z-10 flex h-10 items-center justify-end gap-1.5 px-3">
        <span className="flex size-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-rose-400 shadow-sm backdrop-blur-sm">
          <IconSearch className="size-4" />
        </span>
        <span className="relative flex size-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-rose-400 shadow-sm backdrop-blur-sm">
          <IconBell className="size-4" />
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-800 px-1 text-[10px] leading-none font-semibold text-white shadow-sm ring-2 ring-black/40">
            3
          </span>
        </span>
      </div>

      <div className="absolute inset-x-0 top-[calc(10cqmin_+_2.5rem)] bottom-[4.25rem] z-10 flex flex-col gap-1.5 overflow-hidden px-3 text-zinc-50">
        <div>
          <p className="text-base font-semibold tracking-tight">Good afternoon, Melissa</p>
          <p className="mt-0.5 text-xs text-zinc-400">
            You have 4 upcoming bookings this week.
          </p>
        </div>

        <section className="flex flex-col gap-1">
          <SectionTitle>
            Booking requests
            <span className="text-zinc-400"> · 2</span>
          </SectionTitle>
          <article className={cn(glassCardClassName, "flex flex-col gap-1 p-2.5")}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">Hana Sofea</p>
                <p className="truncate text-xs text-zinc-400">Nikah & Sanding</p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">RM 2,400</p>
            </div>
            <p className="truncate text-sm">
              <span className="font-medium">Sat, 15 Nov · 8:00 AM – 11:00 AM</span>
              <span className="text-zinc-400"> · Nikah</span>
            </p>
            <div className="flex min-w-0 items-center gap-2 text-xs text-zinc-400">
              <p className="flex min-w-0 flex-1 items-center gap-1.5">
                <IconMapPin className="size-3.5 shrink-0" />
                <span className="truncate">The Ritz-Carlton, Kuala Lumpur</span>
              </p>
              <span className="inline-flex shrink-0 items-center gap-1 text-zinc-200">
                <IconBrandInstagram className="size-3.5 text-rose-400" />
                @hanasofea
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-white/15 bg-white/10 text-xs font-medium">
                <IconX className="size-4" />
                Decline
              </span>
              <span className="inline-flex h-7 items-center justify-center gap-1 rounded-md bg-rose-800 text-xs font-medium text-white">
                <IconCheck className="size-4" />
                Approve
              </span>
            </div>
          </article>
        </section>

        <section className="flex flex-col gap-1">
          <SectionTitle>Today&apos;s bookings</SectionTitle>
          <article className={cn(glassCardClassName, "flex flex-col gap-2 p-2.5")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium whitespace-nowrap text-zinc-400">
                  9:00 AM – 12:00 PM
                </p>
                <p className="truncate text-base font-semibold">Ayra Helena</p>
                <p className="truncate text-xs text-zinc-400">Nikah & Sanding · Sanding</p>
              </div>
              <Pill tone="solid">In Progress</Pill>
            </div>
            <div className="flex items-end justify-between gap-3">
              <p className="flex min-w-0 items-center gap-1.5 text-xs text-zinc-400">
                <IconMapPin className="size-3.5 shrink-0" />
                <span className="truncate">JW Marriott Kuala Lumpur</span>
              </p>
              <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md bg-rose-800 px-2.5 text-xs font-medium text-white">
                <IconNavigation className="size-5" />
                Navigate
              </span>
            </div>
          </article>
        </section>

        <section className="flex flex-col gap-3">
          <SectionTitle>Recent activity</SectionTitle>
          <div className={cn(glassCardClassName, "overflow-hidden")}>
            <ul className="divide-y divide-white/10">
              <ActivityRow
                icon={IconCash}
                title="Deposit received"
                detail="Ayra Helena · Nikah & Sanding"
                amount="RM 800"
                status="Confirmed"
                when="2 hours ago"
                unread
              />
              <ActivityRow
                icon={IconCalendarQuestion}
                title="Booking request"
                detail="Hana Sofea · Nikah & Sanding"
                amount="RM 2,400"
                status="Request"
                when="5 hours ago"
                unread
              />
              <ActivityRow
                icon={IconReceipt}
                title="Payment pending"
                detail="Aina Rahman · Trial Makeup"
                amount="RM 150"
                status="Pending"
                when="1 day ago"
              />
            </ul>
          </div>
        </section>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4">
        <div className="flex h-12 items-center justify-around rounded-full bg-white/10 px-1.5 shadow-md ring-1 ring-white/15 backdrop-blur-md">
          <NavIcon icon={IconHome} active label="Home" />
          <NavIcon icon={IconCash} label="Payments" />
          <NavIcon icon={IconPlus} label="Add" />
          <NavIcon icon={IconSettings} label="Settings" />
          <NavIcon icon={IconUser} label="Profile" />
        </div>
      </div>
    </div>
  );
}

function NavIcon({
  icon: Icon,
  active = false,
  label,
}: {
  icon: typeof IconHome;
  active?: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "flex size-11 items-center justify-center rounded-full",
        active ? "bg-white/15 text-rose-400 shadow-sm" : "text-zinc-400"
      )}
      aria-label={label}
    >
      <Icon className={cn("size-5", active && "stroke-[2.25]")} />
    </span>
  );
}

function ActivityRow({
  icon: Icon,
  title,
  detail,
  amount,
  status,
  when,
  unread = false,
}: {
  icon: typeof IconCash;
  title: string;
  detail: string;
  amount: string;
  status: string;
  when: string;
  unread?: boolean;
}) {
  return (
    <li className={cn("relative flex items-center gap-2.5 px-3 py-2.5", unread && "bg-white/5")}>
      {unread ? (
        <span className="absolute top-1/2 left-1.5 size-1.5 -translate-y-1/2 rounded-full bg-rose-400" />
      ) : null}
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-rose-400">
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}>
          {title}
        </p>
        <p className="truncate text-xs text-zinc-400">{detail}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        <p className="text-sm font-semibold tabular-nums">{amount}</p>
        <Pill tone={status === "Confirmed" ? "solid" : "outline"}>{status}</Pill>
        <p className="text-xs text-zinc-400">{when}</p>
      </div>
    </li>
  );
}
