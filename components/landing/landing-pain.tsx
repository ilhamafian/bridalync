"use client";

import { useRef, useState } from "react";

import { landingGlassClassName } from "@/components/landing/glass";
import { cn } from "@/lib/utils";

const slides = [
  "A client messages to check availability. You reply 10 hours later, only to find the date is already taken. Then another client asks for the same date. Now you're doing the same work twice.",
  "Messages keep piling up until WhatsApp restricts your ability to reply.",
  "When a date is available, you still need to collect client details, calculate the quotation and travel fees, check payments manually, and create invoices on Canva.",
  "All while trying not to miss a message or double-book a client.",
  "And at the end of the month? You don't even know exactly how much you've earned.",
  "You didn't start your business to spend all day managing admin.",
];

export function LandingPain() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    setActiveIndex(Math.min(Math.max(index, 0), slides.length - 1));
  }

  function scrollToIndex(index: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  }

  return (
    <section className="px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
          Does this sound familiar?
        </h2>

        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar"
        >
          {slides.map((text, index) => (
            <div key={index} className="w-full shrink-0 snap-start px-1">
              <div
                className={cn(
                  landingGlassClassName,
                  "flex min-h-44 items-center p-6 md:min-h-48 md:p-8"
                )}
              >
                <p className="text-base leading-relaxed text-zinc-800 md:text-lg">
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-1.5">
          {slides.map((text, index) => (
            <button
              key={text}
              type="button"
              onClick={() => scrollToIndex(index)}
              aria-label={`Show item ${index + 1} of ${slides.length}`}
              aria-current={index === activeIndex ? "true" : undefined}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === activeIndex
                  ? "w-4 bg-foreground/70"
                  : "w-1.5 bg-foreground/25"
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
