import { LandingFeatureRow } from "@/components/landing/landing-feature-row";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingFooterCta } from "@/components/landing/landing-footer-cta";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingQuote } from "@/components/landing/landing-quote";
import { LandingSetup } from "@/components/landing/landing-setup";

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <LandingHero />

        <LandingFeatureRow
          title={
            <>
              <span className="block text-landing-ink">One message</span>
              <span className="block text-[#828282]">overlooked.</span>
              <span className="block text-landing-ink">One booking</span>
              <span className="block text-[#828282]">forgotten.</span>
              <span className="block text-landing-ink">One bride</span>
              <span className="block text-[#828282]">disappointed.</span>
            </>
          }
          imageSrc="/landing/Problem1.png"
          imageAlt="Calendar crowded with social media notifications"
        />

        <LandingFeatureRow
          title={
            <>
              Every booking starts with a{" "}
              <span className="text-[#828282]">chat</span>. Every{" "}
              <span className="text-[#828282]">mistake</span> starts there too.
            </>
          }
          imageSrc="/landing/Problem2.png"
          imageAlt="WhatsApp chat showing a double booking"
          reverse
        />

        <LandingFeatureRow
          size="sm"
          title={
            <>
              <span className="block text-landing-ink">One app for enquiries.</span>
              <span className="block text-[#828282]">One app for availability.</span>
              <span className="block text-landing-ink">Another for invoices.</span>
              <span className="block bg-gradient-to-b from-[#828282] to-landing-ink bg-clip-text text-transparent">
                Somehow, you&apos;re expected to keep it all together.
              </span>
            </>
          }
          imageSrc="/landing/Problem3.png"
          imageAlt="Brain connected to multiple apps and platforms"
        />

        <LandingQuote />
        <LandingSetup />
        <LandingFooterCta />
      </main>
      <LandingFooter />
    </>
  );
}
