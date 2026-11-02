"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform } from "motion/react";

import { FadeRise, RevealLine, useAnimateOnScroll } from "@/components/landing/landing-reveal";
import { LandingWaitlistForm } from "@/components/landing/landing-waitlist-form";

const SatinRidges = dynamic(
  () => import("@/components/satin-ridges").then((mod) => mod.SatinRidges),
  { ssr: false }
);

const HERO_BG = "#230b17";

export function LandingWaitlist() {
  const animate = useAnimateOnScroll();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 92%", "start 38%"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [0.92, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [56, 0]);

  return (
    <section ref={sectionRef} id="waitlist" className="scroll-mt-24 px-4 py-6 md:px-10 md:py-8">
      <motion.div
        key={animate ? "motion" : "still"}
        style={animate ? { scale, y } : undefined}
        className="relative mx-auto w-full max-w-[88rem] overflow-hidden rounded-[1.75rem] bg-[#230b17] ring-1 ring-white/20 md:rounded-[2rem]"
      >
        <SatinRidges
          colors={["#961b45", "#ff6653"]}
          backgroundColor={HERO_BG}
          angle={-33}
          scale={1.35}
          depth={1}
          warp={1}
          gloss={0.4}
          highlight={0.85}
          lightAngle={-70}
          sheen={0.65}
          speed={1}
          seed={12}
          clickRipples={false}
          dpr={1}
          detail={0}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
        <div className="relative z-10 flex min-h-[70vh] flex-col justify-between px-8 py-16 sm:px-12 sm:py-20 md:min-h-[78vh] md:px-20 md:py-28">
          <h2 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl md:text-7xl md:leading-[1.02] [text-shadow:0_2px_24px_rgb(35_11_23/0.45)]">
            <RevealLine>Join the waitlist,</RevealLine>
            <RevealLine delay={0.12}>get early access.</RevealLine>
          </h2>
          <FadeRise delay={0.22} y={24} className="mt-10">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between md:gap-12">
              <p className="max-w-md text-lg leading-relaxed text-white/85 md:text-xl [text-shadow:0_1px_12px_rgb(35_11_23/0.4)]">
                Leave your number and we&apos;ll reach out with a personalised
                demo.
              </p>
              <LandingWaitlistForm />
            </div>
          </FadeRise>
        </div>
      </motion.div>
    </section>
  );
}
