import Image from "next/image";

import { LandingWaitlistForm } from "@/components/landing/landing-waitlist-form";

export function LandingFooterCta() {
  return (
    <section
      id="waitlist"
      className="relative overflow-hidden bg-landing-rose px-6 py-20 text-center lg:px-8 lg:py-28"
    >
      <Image
        src="/landing/Flower1.png"
        alt=""
        width={500}
        height={500}
        className="pointer-events-none absolute -bottom-4 -left-4 w-[min(55vw,20rem)] opacity-90 sm:-bottom-6 sm:-left-6 sm:w-[min(45vw,24rem)] lg:bottom-0 lg:left-0 lg:w-[28rem]"
        aria-hidden="true"
      />
      <Image
        src="/landing/Flower2.png"
        alt=""
        width={500}
        height={500}
        className="pointer-events-none absolute -bottom-4 -right-4 w-[min(55vw,20rem)] opacity-90 sm:-bottom-6 sm:-right-6 sm:w-[min(45vw,24rem)] lg:bottom-0 lg:right-0 lg:w-[28rem]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-xl">
        <h2 className="font-serif text-3xl text-landing-cream-text sm:text-4xl lg:text-[2.75rem]">
          Join the waitlist
        </h2>
        <p className="mt-4 font-serif text-lg text-landing-cream-text/85 sm:text-xl">
          Leave your number and we&apos;ll reach out with a personalised demo.
        </p>
        <LandingWaitlistForm />
      </div>
    </section>
  );
}
