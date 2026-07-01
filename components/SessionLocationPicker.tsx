"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { LocationMapPicker, MapsProvider } from "@/components/LocationMapPicker"
import { formatSessionSummary } from "@/utils/booking/utils"
import type { Address } from "@/schemas/addressSchema"
import type { BookingSession } from "@/schemas/booking"

type SessionLocationPickerProps = {
  sessions: BookingSession[]
  sameLocationForAll: boolean
  onSameLocationForAllChange: (value: boolean) => void
  sharedLocation: Address | null
  onSharedLocationChange: (location: Address) => void
  onSessionLocationChange: (sessionId: string, location: Address) => void
}

export function SessionLocationPicker({
  sessions,
  sameLocationForAll,
  onSameLocationForAllChange,
  sharedLocation,
  onSharedLocationChange,
  onSessionLocationChange,
}: SessionLocationPickerProps) {
  return (
    <MapsProvider>
      <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
      <CardContent className="flex flex-col gap-4 pt-(--card-spacing)">
      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              If you have not decided on the location yet, you can just put in the area you are in.
            </p>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={sameLocationForAll}
            onChange={(event) =>
              onSameLocationForAllChange(event.target.checked)
            }
            className="size-4 rounded border-border accent-primary"
          />
          Same location for all sessions
        </label>

        {sameLocationForAll ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">
              Location for all sessions
            </p>
            <LocationMapPicker
              value={sharedLocation}
              onChange={onSharedLocationChange}
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-6">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex flex-col gap-3 border-t border-border pt-4 first:border-t-0 first:pt-0"
              >
                <p className="text-sm font-medium text-foreground">
                  {formatSessionSummary(session)}
                </p>
                <LocationMapPicker
                  value={session.location}
                  onChange={(location) =>
                    onSessionLocationChange(session.id, location)
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      </Card>
    </MapsProvider>
  )
}
