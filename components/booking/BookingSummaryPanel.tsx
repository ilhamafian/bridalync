"use client";

import Image from "next/image";

import { roleLabel } from "@/components/booking/ClientProfile";
import { useLocale } from "@/components/LocaleProvider";
import { cn } from "@/lib/utils";
import type { SessionForm } from "@/schemas/sessionSchema";
import type { PublicProfile } from "@/schemas/userSchema";
import { formatRm } from "@/utils/booking/pricing";
import { formatLocationAddress } from "@/utils/session";

const glassClassName =
  "rounded-xl bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm dark:bg-white/10 dark:ring-white/15";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-2 text-xs leading-5">
      <dt className="w-16 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-foreground">{value}</dd>
    </div>
  );
}

/** Sticky side panel of the client wizard on wide screens: the stylist and the picks so far. */
export function BookingSummaryPanel({
  user,
  eventName,
  sessions,
  styleBySessionKey,
  styleLabel,
  addOnNames,
  contactName,
  totalRm,
  className,
}: {
  user: PublicProfile | null;
  eventName?: string;
  sessions: SessionForm[];
  /** Picked style/look per session `client_key`, already formatted for display. */
  styleBySessionKey: Record<string, string | undefined>;
  styleLabel: string;
  addOnNames: string[];
  contactName: string;
  /** Only passed once prices are shown to the client (review step onward). */
  totalRm?: number | null;
  className?: string;
}) {
  const { t, intlLocale } = useLocale();
  const displayName = user?.name?.trim() || user?.username || "";
  const role = user?.role ? roleLabel(user.role, t) : null;
  const sortedSessions = [...sessions].sort((a, b) => a.order - b.order);
  const name = contactName.trim();
  const isEmpty = !eventName && sortedSessions.length === 0;

  return (
    <aside
      className={cn(
        "flex w-88 shrink-0 flex-col gap-4 overflow-y-auto overscroll-y-contain p-6",
        className
      )}
    >
      {user ? (
        <div className={cn(glassClassName, "flex items-center gap-3 p-3")}>
          <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            {user.profile_photo_url ? (
              <Image
                src={user.profile_photo_url}
                alt=""
                fill
                className="object-cover"
                sizes="48px"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {displayName}
            </p>
            {role ? (
              <p className="truncate text-xs text-muted-foreground">{role}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className={cn(glassClassName, "flex flex-col gap-3 p-4")}>
        <h2 className="text-sm font-medium text-foreground">{t.summaryTitle}</h2>
        {isEmpty ? (
          <p className="text-xs text-muted-foreground">{t.summaryEmpty}</p>
        ) : (
          <>
            {eventName ? (
              <p className="text-base font-semibold leading-6 text-foreground">
                {eventName}
              </p>
            ) : null}
            {sortedSessions.map((session) => {
              const style = styleBySessionKey[session.client_key];
              return (
                <div
                  key={session.client_key}
                  className="border-t border-white/40 pt-3 dark:border-white/15"
                >
                  <p className="mb-1 text-sm font-medium text-foreground">
                    {session.name}
                  </p>
                  <dl className="flex flex-col gap-0.5">
                    <Row
                      label={t.reviewDate}
                      value={new Date(session.date).toLocaleDateString(
                        intlLocale,
                        {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    />
                    <Row
                      label={t.reviewTime}
                      value={`${session.time_slot.startTime} – ${session.time_slot.endTime}`}
                    />
                    {session.ready_by ? (
                      <Row label={t.reviewReadyBy} value={session.ready_by} />
                    ) : null}
                    {session.location ? (
                      <Row
                        label={t.reviewLocation}
                        value={formatLocationAddress(session.location)}
                      />
                    ) : null}
                    {style ? <Row label={styleLabel} value={style} /> : null}
                  </dl>
                </div>
              );
            })}
            {addOnNames.length > 0 ? (
              <div className="border-t border-white/40 pt-3 dark:border-white/15">
                <p className="mb-1 text-sm font-medium text-foreground">
                  {t.reviewAddOns}
                </p>
                <p className="text-xs leading-5 text-foreground">
                  {addOnNames.join(", ")}
                </p>
              </div>
            ) : null}
            {name ? (
              <div className="border-t border-white/40 pt-3 dark:border-white/15">
                <dl>
                  <Row label={t.reviewName} value={name} />
                </dl>
              </div>
            ) : null}
            {typeof totalRm === "number" ? (
              <div className="flex items-baseline justify-between border-t border-white/40 pt-3 dark:border-white/15">
                <span className="text-sm font-medium text-foreground">
                  {t.total}
                </span>
                <span className="text-base font-semibold text-foreground">
                  {formatRm(totalRm)}
                </span>
              </div>
            ) : null}
          </>
        )}
      </section>
    </aside>
  );
}
