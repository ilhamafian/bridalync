import Link from "next/link";

import { LandingFooter } from "./landing-footer";
import { LandingLogo } from "./landing-logo";

type LegalPageProps = {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
};

export function LegalPage({ title, effectiveDate, children }: LegalPageProps) {
  return (
    <>
      <header className="border-b border-landing-ink/5 bg-landing-cream/90">
        <div className="mx-auto flex h-[4.25rem] max-w-3xl items-center justify-between px-6 lg:h-20 lg:px-8">
          <LandingLogo className="[&_img]:h-10 sm:[&_img]:h-11" />
          <Link
            href="/"
            className="font-serif text-base text-landing-ink/70 transition-colors hover:text-landing-ink"
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 lg:px-8 lg:py-16">
        <p className="font-serif text-sm tracking-wide text-landing-ink/50 uppercase">
          Legal
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-landing-ink sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 font-serif text-base text-landing-ink/60">
          Effective date: {effectiveDate}
        </p>

        <div className="mt-10 space-y-8 font-serif text-lg leading-relaxed text-landing-ink/80 [&_a]:text-landing-rose [&_a]:underline [&_a]:underline-offset-2 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-landing-ink [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
          {children}
        </div>
      </main>

      <LandingFooter />
    </>
  );
}
