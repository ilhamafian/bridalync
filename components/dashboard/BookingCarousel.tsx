"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import { HomeBookingCard } from "@/components/dashboard/HomeBookingCard";
import { cn } from "@/lib/utils";
import type { ScheduleItem } from "@/utils/dashboard";

export function BookingCarousel({
  items,
  showDate = false,
  seeMoreHref,
}: {
  items: ScheduleItem[];
  showDate?: boolean;
  seeMoreHref: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll() {
    const track = trackRef.current;
    const [first, second] = Array.from(track?.children ?? []) as HTMLElement[];
    if (!track || !first || !second) return;
    const step = second.offsetLeft - first.offsetLeft;
    const index = Math.round(track.scrollLeft / step);
    setActiveIndex(Math.min(Math.max(index, 0), items.length - 1));
  }

  function scrollToIndex(index: number) {
    const slide = trackRef.current?.children[index] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 no-scrollbar py-1 lg:-mx-6 lg:scroll-px-6 lg:px-6"
      >
        {items.map((item) => (
          <HomeBookingCard
            key={`${item.bookingId}-${item.startsAtMs}`}
            item={item}
            showDate={showDate}
            className="w-full shrink-0 snap-start"
          />
        ))}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <span />
        {items.length > 1 ? (
          <div className="flex items-center gap-1.5">
            {items.map((item, index) => (
              <button
                key={`${item.bookingId}-${item.startsAtMs}`}
                type="button"
                onClick={() => scrollToIndex(index)}
                aria-label={`Show booking ${index + 1} of ${items.length}`}
                aria-current={index === activeIndex}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === activeIndex
                    ? "w-4 bg-foreground/70"
                    : "w-1.5 bg-foreground/25"
                )}
              />
            ))}
          </div>
        ) : (
          <span />
        )}
        <Link
          href={seeMoreHref}
          scroll={false}
          className="justify-self-end text-sm font-medium text-primary hover:underline"
        >
          See more
        </Link>
      </div>
    </div>
  );
}
