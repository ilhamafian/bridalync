import Image from "next/image";

export function LandingQuote() {
  return (
    <section className="relative overflow-hidden px-6 py-16 text-center lg:px-8 lg:py-24">
      <Image
        src="/landing/lipstick.png"
        alt=""
        width={80}
        height={80}
        className="pointer-events-none absolute left-[8%] top-8 hidden w-14 opacity-80 sm:block lg:left-[14%] lg:w-16"
        aria-hidden="true"
      />
      <Image
        src="/landing/veil.png"
        alt=""
        width={90}
        height={110}
        className="pointer-events-none absolute right-[8%] bottom-8 hidden w-16 opacity-80 sm:block lg:right-[14%] lg:w-20"
        aria-hidden="true"
      />

      <p className="relative mx-auto max-w-2xl font-serif text-2xl leading-snug text-landing-ink sm:text-3xl lg:text-[2.15rem] lg:leading-[1.35]">
        You&apos;re busy making brides beautiful. Not managing chats, calendars,
        and invoices.
      </p>
    </section>
  );
}
