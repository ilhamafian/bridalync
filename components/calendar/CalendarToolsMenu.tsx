"use client";

import { useState } from "react";
import {
  IconAdjustments,
  IconCalendarOff,
  IconCalendarStats,
  IconFlame,
} from "@tabler/icons-react";

import { BlockedDatesManager } from "@/components/BlockedDatesManager";
import { BlockYearManager } from "@/components/BlockYearManager";
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

type AvailabilityTool = "hot" | "blocked" | "year";

const TOOLS: Record<
  AvailabilityTool,
  { title: string; description: string }
> = {
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
};

export function CalendarToolsMenu({
  chargeBy,
  packages,
  styles,
  maxBookingYear,
}: {
  chargeBy: "package" | "style";
  packages: PackageItem[];
  styles: StyleItem[];
  maxBookingYear?: number;
}) {
  const [tool, setTool] = useState<AvailabilityTool | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="shrink-0"
            aria-label="Availability tools"
          >
            <IconAdjustments className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="z-100 w-48 min-w-48">
          <DropdownMenuItem onSelect={() => setTool("hot")}>
            <IconFlame />
            Hot dates
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTool("blocked")}>
            <IconCalendarOff />
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
                  />
                ) : null}
                {tool === "blocked" ? (
                  <BlockedDatesManager hideHeader />
                ) : null}
                {tool === "year" ? (
                  <BlockYearManager
                    hideHeader
                    initialMaxBookingYear={maxBookingYear}
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
