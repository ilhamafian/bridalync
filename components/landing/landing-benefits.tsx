"use client";

import dynamic from "next/dynamic";

const VerticalReel = dynamic(
  () => import("@/components/vertical-reel").then((mod) => mod.VerticalReel),
  { ssr: false },
);

const benefits = [
  {
    alt: "Save time",
    title: "Save time",
    body: "4 hours of replying messages can be spent on creating marketing videos",
  },
  {
    alt: "Clear your mind",
    title: "Clear your mind",
    body: "Stop dealing with fussy clients and avoid being overwhelmed",
  },
  {
    alt: "No more admin work",
    title: "No more admin work",
    body: "Focus on making your bride happy and beautiful instead",
  },
  {
    alt: "Stay fully booked",
    title: "Stay fully booked",
    body: "Clients book themselves, even while you're with a bride",
  },
];

export function LandingBenefits() {
  return (
    <section className="relative z-10 px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-50 md:text-4xl">
          What if you can...
        </h2>
        <div className="h-[22rem] w-full md:h-[26rem]">
          <VerticalReel
            items={benefits}
            direction="horizontal"
            aspect={1.75}
            size={0.62}
            curvature={0.35}
            wheel={false}
            repeat={false}
            startIndex={1}
            motionBlur={0.2}
            radius={20}
            captions={false}
            autoplay="step"
            backgroundColor="transparent"
            ariaLabel="Benefits. Drag to move between them, or use the arrow keys."
          />
        </div>
      </div>
    </section>
  );
}
