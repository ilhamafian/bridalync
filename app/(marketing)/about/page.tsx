import type { Metadata } from "next";

import { LandingAbout } from "@/components/landing/landing-about";
import { LandingHomeFooter } from "@/components/landing/landing-home-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingSmoothScroll } from "@/components/landing/landing-smooth-scroll";
import { WaitlistDialogProvider } from "@/components/landing/landing-waitlist-form";

export const metadata: Metadata = {
  title: "About Us | Bridalync",
  description:
    "Bridalync started with Yana, a hijab stylist who left Petronas, and Ghazi, the engineer she teamed up with to build a better system for glam teams in Malaysia.",
};

export const viewport = {
  themeColor: "#230b17",
};

export default function AboutPage() {
  return (
    <WaitlistDialogProvider>
      <LandingSmoothScroll>
        <div
          className="dark min-h-dvh bg-[#230b17] text-zinc-100"
          style={{ colorScheme: "dark" }}
        >
          <LandingNav />
          <main>
            <LandingAbout />
          </main>
          <LandingHomeFooter />
        </div>
      </LandingSmoothScroll>
    </WaitlistDialogProvider>
  );
}
