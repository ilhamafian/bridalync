import Image from "next/image";

import { LEGAL_URLS, SITE_CONTACT_EMAIL } from "@/lib/site";

import { LandingLogo } from "./landing-logo";

const footerLinks = {
  Features: [
    { href: "#features", label: "Product" },
    { href: "#pricing", label: "Pricing" },
    { href: "#waitlist", label: "Waitlist" },
  ],
  Company: [
    { href: "#about", label: "About" },
    { href: LEGAL_URLS.privacy, label: "Privacy Policy" },
    { href: LEGAL_URLS.terms, label: "Terms of Service" },
  ],
  Socials: [
    { href: "#", label: "Instagram" },
    { href: "#", label: "TikTok" },
    { href: `mailto:${SITE_CONTACT_EMAIL}`, label: "Email" },
  ],
};

export function LandingFooter() {
  return (
    <footer
      id="about"
      className="bg-landing-footer px-6 py-14 text-landing-cream-text lg:px-8 lg:py-16"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.2fr_repeat(3,1fr)] lg:gap-8">
          <div>
            <LandingLogo variant="light" />
            <p className="mt-4 font-serif text-sm leading-relaxed text-landing-cream-text/70">
              Bridalync helps bridal hair and makeup artists manage bookings,
              availability, clients, and payments in one place.
            </p>
            <p className="mt-3 font-serif text-sm leading-relaxed text-landing-cream-text/70">
              © {new Date().getFullYear()} Bridalync. All rights reserved.
            </p>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="font-serif text-sm font-semibold tracking-wide text-landing-cream-text/90 uppercase">
                {heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="font-serif text-base text-landing-cream-text/70 transition-colors hover:text-landing-cream-text"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-landing-cream-text/10 pt-8">
          <p className="font-serif text-sm text-landing-cream-text/50">
            <a
              href={LEGAL_URLS.privacy}
              className="transition-colors hover:text-landing-cream-text"
            >
              Privacy Policy
            </a>
            {" · "}
            <a
              href={LEGAL_URLS.terms}
              className="transition-colors hover:text-landing-cream-text"
            >
              Terms of Service
            </a>
          </p>
          <span className="flex size-11 items-center justify-center overflow-hidden rounded-full bg-landing-cream-text">
            <Image
              src="/landing/Bridalync Icon.png"
              alt=""
              width={44}
              height={44}
              className="size-9 object-contain"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </footer>
  );
}
