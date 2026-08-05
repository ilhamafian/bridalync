import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-6 text-center sm:px-6 lg:px-8 lg:pb-24 lg:pt-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(28,28,28,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(28,28,28,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl">
        <Image
          src="/landing/Hero Image.webp"
          alt=""
          width={1600}
          height={1067}
          sizes="(max-width: 1280px) 100vw, 1152px"
          className="mx-auto h-auto w-full"
          priority
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
          <Image
            src="/landing/Bridalync Icon.png"
            alt="Bridalync"
            width={72}
            height={72}
            className="mb-5 size-12 rounded-2xl drop-shadow-[6px_8px_10px_rgba(0,0,0,0.28)] sm:mb-6 sm:size-14 lg:size-16"
            priority
          />

          <h1 className="max-w-2xl font-serif text-3xl leading-tight tracking-tight sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
            <span className="block text-landing-ink font-extrabold">Book, plan, and track</span>
            <span className="block text-[#828282] font-extrabold">all in one place</span>
          </h1>

          <p className="mx-auto mt-4 max-w-3xl font-serif text-base leading-relaxed text-landing-ink/75 sm:mt-5 sm:whitespace-nowrap sm:text-xl">
          The all in one app for glam teams to manage bookings efficiently!
          </p>

          <div className="mt-6 sm:mt-8">
            <Button
              asChild
              size="lg"
              className="h-11 rounded-full bg-landing-rose px-7 font-serif text-base font-medium text-landing-cream-text hover:bg-landing-rose/90 sm:h-12 sm:px-8"
            >
              <Link href="#waitlist">Join Waitlist</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
