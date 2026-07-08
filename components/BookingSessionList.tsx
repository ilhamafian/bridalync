"use client"

import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatLocationAddress, formatSessionSummary } from "@/utils/session"
import type { SessionForm } from "@/schemas/sessionSchema"

type SessionListItem = Pick<
  SessionForm,
  "name" | "date" | "time_slot" | "location" | "order"
> & {
  client_key?: string
}

type BookingSessionListProps = {
  sessions: SessionListItem[]
  onRemove?: (clientKey: string) => void
  showLocation?: boolean
  emptyMessage?: string
}

export function BookingSessionList({
  sessions,
  onRemove,
  showLocation = false,
  emptyMessage = "No sessions yet — pick an event, date, and time.",
}: BookingSessionListProps) {
  if (sessions.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">{emptyMessage}</p>
    )
  }

  return (
    <ul className="flex w-full flex-col gap-2">
      {sessions.map((session) => {
        const clientKey = session.client_key
        return (
        <li
          key={
            session.client_key ??
            `${session.order}-${session.name}-${new Date(session.date).toISOString()}-${session.time_slot.startTime}-${session.time_slot.endTime}`
          }
          className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm"
        >
          <div className="min-w-0 text-left">
            <p className="font-medium text-foreground">
              {formatSessionSummary(session)}
            </p>
            {showLocation && session.location && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatLocationAddress(session.location)}
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
              aria-label={`Remove ${session.name} session`}
            >
              <XIcon />
            </Button>
          )}
        </li>
        )
      })}
    </ul>
  )
}
