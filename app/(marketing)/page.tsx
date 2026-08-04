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
          title="One message overlooked. One booking forgotten. One bride disappointed."
          imageSrc="/landing/Problem1.png"
          imageAlt="Calendar crowded with social media notifications"
        />

        <LandingFeatureRow
          title="Every booking starts with a chat. Every mistake starts there too."
          imageSrc="/landing/Problem2.png"
          imageAlt="WhatsApp chat showing a double booking"
          reverse
        />

        <LandingFeatureRow
          title="One app for enquiries. One app for availability. Another for invoices. Somehow, you're expected to keep it all together."
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
