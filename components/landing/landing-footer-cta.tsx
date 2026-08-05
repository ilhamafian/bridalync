import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

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
          Connect with us
        </h2>
        <p className="mt-4 font-serif text-lg text-landing-cream-text/85 sm:text-xl">
        Book a personalised demo and discover how Bridalync saves you hours every week
        </p>
        <Button
          asChild
          size="lg"
          className="mt-8 h-12 rounded-full border-2 border-landing-cream-text/40 bg-landing-cream-text/30 px-8 font-serif text-base font-medium text-landing-cream-text shadow-sm backdrop-blur-md hover:bg-landing-cream-text/40"
        >
          <Link href="/auth?tab=signup">Join Waitlist</Link>
        </Button>
      </div>
    </section>
  );
}
