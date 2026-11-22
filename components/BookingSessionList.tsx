"use client"

import { XIcon } from "lucide-react"

import { WizardGlass } from "@/components/booking/wizardGlass"
import { useLocale } from "@/components/LocaleProvider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatSessionSummary, formatWalkInAddress } from "@/utils/session"
import type { SessionForm } from "@/schemas/sessionSchema"

type SessionListItem = Pick<
  SessionForm,
  | "name"
  | "date"
  | "time_slot"
  | "slot_count"
  | "ready_by"
  | "location"
  | "walk_in"
  | "order"
> & {
  client_key?: string
  styleName?: string
}

type BookingSessionListProps = {
  sessions: SessionListItem[]
  onRemove?: (clientKey: string) => void
  showLocation?: boolean
  emptyMessage?: string
  frosted?: boolean
}

export function BookingSessionList({
  sessions,
  onRemove,
  showLocation = false,
  emptyMessage,
  frosted = false,
}: BookingSessionListProps) {
  const { t, format, intlLocale } = useLocale()

  if (sessions.length === 0) {
    const empty = (
      <p className="text-center text-sm text-muted-foreground">
        {emptyMessage ?? t.noSessionsPickEvent}
      </p>
    )
    if (!frosted) return empty
    return <WizardGlass className="p-3">{empty}</WizardGlass>
  }

  const list = (
    <ul className="flex w-full flex-col gap-2">
      {sessions.map((session) => {
        const clientKey = session.client_key
        return (
        <li
          key={
            session.client_key ??
            `${session.order}-${session.name}-${new Date(session.date).toISOString()}-${session.time_slot.startTime}-${session.time_slot.endTime}`
          }
          className={cn(
            "flex items-start justify-between gap-3 text-sm",
            frosted
              ? "rounded-md px-1 py-2.5"
              : "rounded-lg border border-border bg-card px-3 py-2.5"
          )}
        >
          <div className="min-w-0 text-left">
            <p className="font-medium text-foreground">
              {formatSessionSummary(session, intlLocale)}
            </p>
            {session.styleName ? (
              <p className="text-muted-foreground">{session.styleName}</p>
            ) : null}
            {(session.slot_count ?? 1) > 1 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {format(t.slotCount, { count: session.slot_count ?? 1 })}
              </p>
            )}
            {session.ready_by && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {format(t.readyBy, { time: session.ready_by })}
              </p>
            )}
            {showLocation && session.location && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatWalkInAddress(session.location, session.walk_in, t.walkIn)}
              </p>
            )}
          </div>
          {onRemove && clientKey && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground"
              onClick={() => onRemove(clientKey)}
              aria-label={format(t.removeSession, { sessionName: session.name })}
            >
              <XIcon />
            </Button>
          )}
        </li>
        )
      })}
    </ul>
  )

  if (!frosted) return list
  return <WizardGlass className="p-3">{list}</WizardGlass>
}
