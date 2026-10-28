import { LandingBenefits } from "@/components/landing/landing-benefits";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingHomeFooter } from "@/components/landing/landing-home-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingPain } from "@/components/landing/landing-pain";
import { LandingSolution } from "@/components/landing/landing-solution";
import { LandingWaitlist } from "@/components/landing/landing-waitlist";

export const viewport = {
  themeColor: "#230b17",
};

export default function LandingPage() {
  return (
    <div
      id="top"
      className="dark min-h-dvh bg-[#230b17] text-zinc-100"
      style={{ colorScheme: "dark" }}
    >
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
  );
}
