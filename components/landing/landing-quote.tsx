import Image from "next/image";

export function LandingQuote() {
  return (
    <section className="px-6 py-16 text-center lg:px-8 lg:py-24">
      <div className="relative mx-auto max-w-2xl px-12 sm:px-14 lg:max-w-3xl lg:px-16">
        <Image
          src="/landing/lipstick.png"
          alt=""
          width={56}
          height={56}
          className="pointer-events-none absolute top-1/2 left-0 hidden w-9 -translate-y-1/2 opacity-80 sm:block lg:w-10"
          aria-hidden="true"
        />

        <div className="space-y-1">
          <p className="font-serif text-2xl font-bold leading-snug text-landing-ink sm:text-3xl lg:text-[2.15rem] lg:leading-[1.35]">
            You&apos;re busy making brides beautiful.
          </p>
          <p className="font-serif text-2xl font-bold leading-snug text-landing-ink sm:text-3xl lg:text-[2.15rem] lg:leading-[1.35]">
            Not managing chats, calendars, and invoices.
          </p>
        </div>

        <Image
          src="/landing/veil.png"
          alt=""
          width={80}
          height={100}
          className="pointer-events-none absolute top-1/2 right-0 hidden w-14 -translate-y-1/2 opacity-80 sm:block lg:w-16"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
