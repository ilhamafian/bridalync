"use client";

import { useEffect, useState } from "react";
import {
  IconAdjustments,
  IconBan,
  IconBrandGoogle,
  IconCalendarStats,
  IconFlame,
} from "@tabler/icons-react";

import { BlockedDatesManager } from "@/components/BlockedDatesManager";
import { BlockYearManager } from "@/components/BlockYearManager";
import { GoogleCalendarImport } from "@/components/calendar/GoogleCalendarImport";
import { HotDatesManager } from "@/components/HotDatesManager";
import type { PackageItem, StyleItem } from "@/components/PackagesManager";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";

type CalendarTool = "hot" | "blocked" | "year" | "google";

const TOOLS: Record<CalendarTool, { title: string; description: string }> = {
  hot: {
    title: "Hot dates",
    description:
      "Tap a start and end date, then set a higher price for that range. Leave blank to keep the catalog price.",
  },
  blocked: {
    title: "Blocked dates",
    description:
      "Tap a start and end date to block consecutive days. Clients cannot book on blocked dates.",
  },
  year: {
    title: "Booking year",
    description: "Close next year until you are ready to take bookings.",
  },
  google: {
    title: "Import Google Calendar",
    description:
      "Bring one-off Google Calendar events into Bridalync as bookings. Holidays and repeating events are left out.",
  },
};

export function CalendarToolsMenu({
  chargeBy,
  packages,
  styles,
  maxBookingYear,
  initialTool = null,
  openGoogleImport = false,
  onAvailabilityChange,
  onImported,
}: {
  chargeBy: "package" | "style";
  packages: PackageItem[];
  styles: StyleItem[];
  maxBookingYear?: number;
  initialTool?: CalendarTool | null;
  openGoogleImport?: boolean;
  onAvailabilityChange?: () => void;
  onImported?: (bookings: SerializedBooking[]) => void;
}) {
  const [tool, setTool] = useState<CalendarTool | null>(initialTool);

  useEffect(() => {
    if (openGoogleImport) setTool("google");
  }, [openGoogleImport]);

  function handleSaved() {
    onAvailabilityChange?.();
    setTool(null);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
          >
            <IconAdjustments className="size-4" />
            Edit
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="z-100 w-56 min-w-56">
          <DropdownMenuItem onSelect={() => setTool("google")}>
            <IconBrandGoogle />
            Import Google Calendar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTool("hot")}>
            <IconFlame />
            Hot dates
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTool("blocked")}>
            <IconBan />
            Blocked dates
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTool("year")}>
            <IconCalendarStats />
            Booking year
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={tool != null} onOpenChange={(open) => !open && setTool(null)}>
        <SheetContent
          side="bottom"
          contained
          className="max-h-[85dvh] overflow-y-auto rounded-t-2xl"
        >
          {tool ? (
            <>
              <SheetHeader>
                <SheetTitle>{TOOLS[tool].title}</SheetTitle>
                <SheetDescription>{TOOLS[tool].description}</SheetDescription>
              </SheetHeader>
              <div className="px-6 pb-6">
                {tool === "hot" ? (
                  <HotDatesManager
                    hideHeader
                    chargeBy={chargeBy}
                    packages={packages}
                    styles={styles}
                    onSaved={handleSaved}
                  />
                ) : null}
                {tool === "blocked" ? (
                  <BlockedDatesManager
                    hideHeader
                    onSaved={handleSaved}
                  />
                ) : null}
                {tool === "year" ? (
                  <BlockYearManager
                    hideHeader
                    initialMaxBookingYear={maxBookingYear}
                    onSaved={handleSaved}
                  />
                ) : null}
                {tool === "google" ? (
                  <GoogleCalendarImport
                    onImported={(bookings) => {
                      onImported?.(bookings);
                      if (bookings.length > 0) {
                        setTool(null);
                      }
                    }}
                  />
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
