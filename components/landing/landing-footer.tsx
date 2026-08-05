import Image from "next/image";
import Link from "next/link";

import { LandingLogo } from "./landing-logo";

const footerLinks = {
  Features: [
    { href: "#features", label: "Product" },
    { href: "#pricing", label: "Pricing" },
    { href: "#waitlist", label: "Waitlist" },
  ],
  Company: [
    { href: "#about", label: "About" },
    { href: "#", label: "Careers" },
    { href: "#", label: "Blog" },
  ],
  Socials: [
    { href: "#", label: "Instagram" },
    { href: "#", label: "TikTok" },
    { href: "mailto:hello@bridalync.com", label: "Email" },
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
                    <Link
                      href={link.href}
                      className="font-serif text-base text-landing-cream-text/70 transition-colors hover:text-landing-cream-text"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-landing-cream-text/10 pt-8">
          <p className="font-serif text-sm text-landing-cream-text/50">
            Privacy · Terms
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
