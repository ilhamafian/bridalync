import { AnimatedFlow } from "@/components/animated-flow";
import { LandingBenefits } from "@/components/landing/landing-benefits";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHomeFooter } from "@/components/landing/landing-home-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingPain } from "@/components/landing/landing-pain";
import { LandingSolution } from "@/components/landing/landing-solution";
import { LandingWaitlist } from "@/components/landing/landing-waitlist";

export default function LandingPage() {
  return (
    <div id="top" className="relative min-h-dvh">
      <AnimatedFlow
        variant="blush"
        flowSpeed={0.9}
        distortionWarp={1.4}
        filmGrain={0.25}
        rotationAngle={120}
        className="pointer-events-none absolute inset-0 min-h-0"
      />
      <div className="relative">
        <LandingNav />
        <main>
          <LandingHero />
          <LandingPain />
          <LandingBenefits />
          <LandingSolution />
          <LandingWaitlist />
          <LandingFaq />
        </main>
        <LandingHomeFooter />
      </div>
    </div>
  );
}
