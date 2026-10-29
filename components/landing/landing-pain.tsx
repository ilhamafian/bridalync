"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

import { cn } from "@/lib/utils";

const InterferenceRibbons = dynamic(
  () => import("@/components/interference-ribbons").then((mod) => mod.InterferenceRibbons),
  { ssr: false }
);

const PAGE_BG = "#230b17";

const PX_PER_WORD = 40;
const FADE_PX = 40;
/** About three mouse-wheel ticks with the finished block still on screen. */
const HOLD_PX = 300;
const DIM = "rgba(255, 255, 255, 0.28)";
const LIT = "rgba(255, 255, 255, 1)";

const paragraphs = [
  "A client messages to check your availability. You reply 10 hours later, only to find the date is already taken.",
  "Then another client asks for the same date. Now you're doing the same work twice.",
  "When a date is available, you still need to collect client details, calculate the quotation and travel fees, check payments manually, and create invoices.",
  "All while trying not to miss a message or double-book a client. And at the end of the month? You don't even know exactly how much you've earned.",
  "Running your business shouldn't have to be this hard.",
];

const sentenceTypeClassName =
  "w-full text-left text-3xl font-medium leading-[1.15] tracking-tight md:text-5xl";

const headingClassName =
  "text-left text-2xl font-medium leading-tight tracking-tight text-zinc-50 md:text-3xl";

type SentenceRange = {
  text: string;
  words: string[];
  highlightEnd: number;
  leaveAt: number;
  opacityInput: number[];
  opacityOutput: number[];
  wordStart: number[];
  wordEnd: number[];
};

function buildSentenceRanges(texts: readonly string[]) {
  const sentences = texts.map((text) => ({
    text,
    words: text.split(/\s+/).filter(Boolean),
  }));
  const wordCount = sentences.reduce((sum, sentence) => sum + sentence.words.length, 0);
  const gapCount = Math.max(sentences.length - 1, 0);
  const scrollPx =
    wordCount * PX_PER_WORD + gapCount * (HOLD_PX + FADE_PX * 2);
  let cursor = 0;

  const ranges: SentenceRange[] = sentences.map((sentence, index) => {
    const isFirst = index === 0;
    const isLast = index === sentences.length - 1;
    const highlightPx = sentence.words.length * PX_PER_WORD;
    // Fade out, then fade in. The windows don't overlap, so a gray
    // block never sits behind the one on screen. After the last word
    // turns white, the block stays put for a few wheel ticks.
    const fadeInStart = isFirst ? 0 : cursor / scrollPx;
    if (!isFirst) cursor += FADE_PX;
    const fadeInEnd = cursor / scrollPx;
    cursor += highlightPx;
    const highlightEnd = isLast ? 1 : cursor / scrollPx;
    if (!isLast) cursor += HOLD_PX;
    const leaveAt = isLast ? 1 : cursor / scrollPx;
    if (!isLast) cursor += FADE_PX;
    const fadeOutEnd = isLast ? 1 : cursor / scrollPx;
    const span = highlightEnd - fadeInEnd;
    const wordStart = sentence.words.map(
      (_, wordIndex) => fadeInEnd + (wordIndex / sentence.words.length) * span
    );
    const wordEnd = sentence.words.map(
      (_, wordIndex) => fadeInEnd + ((wordIndex + 1) / sentence.words.length) * span
    );
    const opacityInput = isFirst
      ? [0, leaveAt, fadeOutEnd]
      : isLast
        ? [fadeInStart, fadeInEnd, 1]
        : [fadeInStart, fadeInEnd, leaveAt, fadeOutEnd];
    const opacityOutput = isFirst ? [1, 1, 0] : isLast ? [0, 1, 1] : [0, 1, 1, 0];

    return {
      text: sentence.text,
      words: sentence.words,
      highlightEnd,
      leaveAt,
      opacityInput,
      opacityOutput,
      wordStart,
      wordEnd,
    };
  });

  return { ranges, scrollPx };
}

const { ranges, scrollPx } = buildSentenceRanges(paragraphs);
const longest = ranges.reduce((current, range) =>
  range.text.length > current.text.length ? range : current
);

function sentenceIndexAt(progress: number) {
  for (let index = 0; index < ranges.length; index += 1) {
    if (index === ranges.length - 1 || progress < ranges[index].leaveAt) {
      return index;
    }
  }
  return ranges.length - 1;
}

function padBlockNumber(value: number) {
  return String(value).padStart(2, "0");
}

function PainHeading({ index }: { index: number }) {
  const current = padBlockNumber(index + 1);
  const total = padBlockNumber(ranges.length);

  return (
    <div className="relative z-10 flex flex-col items-start gap-8 md:-translate-y-10">
      <h2 className={headingClassName}>Does this ring a bell?</h2>
      <div className="flex flex-col items-start gap-2.5">
        <p
          className="rounded-md border border-white/25 px-2 py-1 text-xs font-medium tracking-wide text-white/75"
          aria-label={`Block ${index + 1} of ${ranges.length}`}
        >
          {current} / {total}
        </p>
        <p className="text-[11px] font-medium tracking-[0.18em] text-white/40 uppercase">
          The problem
        </p>
      </div>
    </div>
  );
}

function PainRibbons({ className }: { className?: string }) {
  return (
    <InterferenceRibbons
      colors={["#961b45", "#ff6653"]}
      backgroundColor={PAGE_BG}
      wires={13}
      lineWidth={4.00}
      ribbonWidth={0.25}
      amplitude={0.3}
      waveLength={0.75}
      angle={0}
      twist={1.60}
      curl={0.62}
      className={cn("h-[32rem] min-h-0 w-full md:h-[40rem]", className)}
    />
  );
}

function PainProgress({ progress }: { progress: MotionValue<number> }) {
  const scaleX = useTransform(progress, [0, 1], [0, 1]);

  return (
    <div className="absolute inset-x-0 top-0 z-30 h-1 bg-white/15" aria-hidden>
      <motion.div
        className="h-full origin-left bg-white"
        style={{ scaleX, transformOrigin: "left" }}
      />
    </div>
  );
}

function PainWord({
  word,
  trailingSpace,
  progress,
  start,
  end,
}: {
  word: string;
  trailingSpace: boolean;
  progress: MotionValue<number>;
  start: number;
  end: number;
}) {
  const color = useTransform(progress, [start, end], [DIM, LIT]);

  return (
    <motion.span style={{ color }}>
      {word}
      {trailingSpace ? " " : ""}
    </motion.span>
  );
}

function PainSentence({
  range,
  progress,
  active,
}: {
  range: SentenceRange;
  progress: MotionValue<number>;
  active: boolean;
}) {
  const opacity = useTransform(progress, range.opacityInput, range.opacityOutput);
  const visibility = useTransform(opacity, (value) => (value > 0.01 ? "visible" : "hidden"));

  return (
    <motion.p
      style={{ opacity, visibility }}
      aria-hidden={!active}
      className="absolute inset-0 flex items-center justify-start"
    >
      <span
        className={cn(
          sentenceTypeClassName,
          "text-[rgba(255,255,255,0.28)]",
          !active && "pointer-events-none select-none"
        )}
      >
        {range.words.map((word, index) => (
          <PainWord
            key={`${range.text}-${index}`}
            word={word}
            trailingSpace={index < range.words.length - 1}
            progress={progress}
            start={range.wordStart[index]}
            end={range.wordEnd[index]}
          />
        ))}
      </span>
    </motion.p>
  );
}

function LandingPainStatic() {
  return (
    <section className="px-4 py-16 md:px-12 md:py-24 lg:px-16">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 md:grid-cols-3 md:gap-x-16">
        <PainHeading index={0} />
        <div className="flex flex-col gap-8 md:col-span-2 md:translate-y-14">
          {ranges.map((range) => (
            <p key={range.text} className={cn(sentenceTypeClassName, "text-zinc-100")}>
              {range.text}
            </p>
          ))}
        </div>
        <PainRibbons className="col-span-full mt-4 ml-[calc(50%-50vw)] w-screen max-w-none md:mt-6" />
      </div>
    </section>
  );
}

function LandingPainScroll() {
  const trackRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });
  // useScroll's progress can hardware-accelerate opacity. That animation
  // doesn't hold the last keyframe, so a finished sentence fades back in.
  const progress = useMotionValue(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    progress.set(value);
    const next = sentenceIndexAt(value);
    setActiveIndex((current) => (current === next ? current : next));
  });

  useEffect(() => {
    const value = scrollYProgress.get();
    progress.set(value);
    setActiveIndex(sentenceIndexAt(value));
  }, [progress, scrollYProgress]);

  return (
    <section
      ref={trackRef}
      className="relative"
      style={{ height: `calc(100dvh + ${scrollPx}px)` }}
    >
      <div className="sticky top-0 h-dvh">
        <PainProgress progress={progress} />
        <div className="relative z-10 flex h-full w-full items-center px-4 md:px-12 lg:px-16">
          <div className="relative grid w-full grid-cols-1 items-start gap-10 md:grid-cols-3 md:gap-x-16">
            <PainRibbons className="absolute top-[calc(100%-14rem)] -right-4 -left-4 z-0 w-auto md:top-[calc(100%-13rem)] md:-right-12 md:-left-12 lg:-right-16 lg:-left-16" />
            <PainHeading index={activeIndex} />
            <div className="relative z-10 w-full md:col-span-2 md:translate-y-14">
              <p className={cn(sentenceTypeClassName, "invisible")} aria-hidden>
                {longest.words.map((word, index) => (
                  <span key={index}>
                    {word}
                    {index < longest.words.length - 1 ? " " : ""}
                  </span>
                ))}
              </p>
              {ranges.map((range, index) => (
                <PainSentence
                  key={range.text}
                  range={range}
                  progress={progress}
                  active={index === activeIndex}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingPain() {
  const prefersReducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (mounted && prefersReducedMotion) return <LandingPainStatic />;
  return <LandingPainScroll />;
}
