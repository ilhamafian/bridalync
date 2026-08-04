import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

function HeroFloatingCards() {
  return (
    <div className="relative mx-auto mb-4 h-44 w-full max-w-2xl sm:h-56 md:mb-6 md:h-64">
      <Image
        src="/landing/Sticky Note.png"
        alt=""
        width={160}
        height={180}
        className="absolute left-[2%] top-[12%] w-[28%] max-w-[150px] -rotate-6 drop-shadow-lg sm:left-[6%]"
        priority
      />
      <Image
        src="/landing/Recent bookings.png"
        alt=""
        width={220}
        height={160}
        className="absolute right-[0%] top-[0%] w-[38%] max-w-[210px] rotate-6 drop-shadow-lg sm:right-[4%]"
        priority
      />
      <Image
        src="/landing/Upcoming Jobs.png"
        alt=""
        width={240}
        height={160}
        className="absolute bottom-[0%] left-[18%] w-[42%] max-w-[230px] -rotate-3 drop-shadow-lg sm:left-[22%]"
        priority
      />
      <Image
        src="/landing/Revenue.png"
        alt=""
        width={200}
        height={140}
        className="absolute bottom-[8%] right-[6%] w-[34%] max-w-[190px] rotate-[8deg] drop-shadow-lg"
        priority
      />
    </div>
  );
}

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-10 text-center lg:px-8 lg:pb-24 lg:pt-14">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(28,28,28,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(28,28,28,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-3xl">
        <HeroFloatingCards />

        <Image
          src="/landing/Bridalync Icon.png"
          alt="Bridalync"
          width={72}
          height={72}
          className="mx-auto mb-6 size-14 rounded-2xl shadow-sm sm:size-16"
          priority
        />

        <h1 className="font-serif text-4xl leading-tight tracking-tight text-landing-ink sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
          Book, plan, and track all in one place
        </h1>

        <p className="mx-auto mt-5 max-w-lg font-serif text-lg leading-relaxed text-landing-ink/70 sm:text-xl">
          The all-in-one tool for bridal hair and makeup artists.
        </p>

        <div className="mt-8">
          <Button
            asChild
            size="lg"
            className="h-12 rounded-full bg-landing-rose px-8 font-serif text-base font-medium text-landing-cream-text hover:bg-landing-rose/90"
          >
            <Link href="#waitlist">Join the Waitlist</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
