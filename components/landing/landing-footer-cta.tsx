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
        width={280}
        height={280}
        className="pointer-events-none absolute -bottom-16 -left-10 w-48 opacity-90 sm:w-64 lg:w-72"
        aria-hidden="true"
      />
      <Image
        src="/landing/Flower2.png"
        alt=""
        width={280}
        height={280}
        className="pointer-events-none absolute -bottom-12 -right-8 w-44 opacity-90 sm:w-60 lg:w-72"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-xl">
        <h2 className="font-serif text-3xl text-landing-cream-text sm:text-4xl lg:text-[2.75rem]">
          Connect with us
        </h2>
        <p className="mt-4 font-serif text-lg text-landing-cream-text/85 sm:text-xl">
          Follow along as we build Bridalync for bridal artists like you.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-8 h-12 rounded-full border border-landing-cream-text/30 bg-landing-ink px-8 font-serif text-base font-medium text-landing-cream-text hover:bg-landing-ink/90"
        >
          <Link href="/auth?tab=signup">Let&apos;s connect</Link>
        </Button>
      </div>
    </section>
  );
}
