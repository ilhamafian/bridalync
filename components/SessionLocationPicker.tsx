"use client"

import { Card, CardContent } from "@/components/ui/card"
import { LocationMapPicker, MapsProvider } from "@/components/LocationMapPicker"
import { formatSessionSummary } from "@/utils/session"
import type { Address } from "@/schemas/addressSchema"
import type { SessionForm } from "@/schemas/sessionSchema"

type SessionLocationPickerProps = {
  sessions: SessionForm[]
  sameLocationForAll: boolean
  onSameLocationForAllChange: (value: boolean) => void
  sharedLocation: Address | null
  onSharedLocationChange: (location: Address) => void
  onSessionLocationChange: (clientKey: string, location: Address) => void
  sharedLocationHelperText?: string
  sessionLocationHelperTextByKey?: Record<string, string | undefined>
}

export function SessionLocationPicker({
  sessions,
  sameLocationForAll,
  onSameLocationForAllChange,
  sharedLocation,
  onSharedLocationChange,
  onSessionLocationChange,
  sharedLocationHelperText,
  sessionLocationHelperTextByKey,
}: SessionLocationPickerProps) {
  return (
    <MapsProvider>
      <Card className="mx-auto w-full min-w-72 bg-white/30 shadow-sm ring-white/60 backdrop-blur-sm [--card-spacing:--spacing(6)] sm:min-w-80 dark:bg-white/10 dark:ring-white/15">
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
            className="size-4 rounded border-border accent-rose-800"
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
            {sharedLocationHelperText && (
              <p className="text-xs text-muted-foreground">
                {sharedLocationHelperText}
              </p>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-6">
            {sessions.map((session) => (
              <li
                key={session.client_key}
                className="flex flex-col gap-3 border-t border-white/40 pt-4 first:border-t-0 first:pt-0 dark:border-white/15"
              >
                <p className="text-sm font-medium text-foreground">
                  {formatSessionSummary(session)}
                </p>
                <LocationMapPicker
                  value={session.location ?? null}
                  onChange={(location) =>
                    onSessionLocationChange(session.client_key, location)
                  }
                />
                {sessionLocationHelperTextByKey?.[session.client_key] && (
                  <p className="text-xs text-muted-foreground">
                    {sessionLocationHelperTextByKey[session.client_key]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      </Card>
    </MapsProvider>
  )
}
