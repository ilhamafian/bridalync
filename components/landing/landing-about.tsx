"use client";

import { useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { IconArrowRight } from "@tabler/icons-react";

import {
  DEFAULT_COUNTRY_CODE,
  PhoneNumberInput,
  isValidPhoneNumber,
} from "@/components/PhoneNumberInput";
import { FadeRise, RevealMask } from "@/components/landing/landing-reveal";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { cn } from "@/lib/utils";

const SatinRidges = dynamic(
  () => import("@/components/satin-ridges").then((mod) => mod.SatinRidges),
  { ssr: false },
);

const PAGE_BG = "#230b17";

const GLASS_SHADOW =
  "shadow-[0_10px_40px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.45)]";

const fieldClassName = cn(
  "h-12 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-base text-white",
  "placeholder:text-white/40",
  "outline-none focus-visible:ring-2 focus-visible:ring-white/40",
);

const selectTriggerClassName = cn(
  "h-12 w-[6.75rem] shrink-0 rounded-xl border border-white/15 bg-black/40 px-3 text-base text-white shadow-none",
  "hover:bg-black/50 dark:bg-black/40 dark:text-white dark:hover:bg-black/50",
  "data-[size=default]:h-12 [&_svg]:text-white/70",
  "focus-visible:border-white/30 focus-visible:ring-2 focus-visible:ring-white/40",
);

const selectContentClassName =
  "border border-white/15 bg-[#230b17] text-white **:data-[slot=select-item]:text-white **:data-[slot=select-item]:focus:bg-white/10 **:data-[slot=select-item]:focus:text-white";

/** Drop portraits at these paths and they replace the initials. */
const founders = [
  {
    name: "Yana Nazri",
    role: "Head of Product",
    initials: "YN",
    imageSrc: "/landing/founders/yana.webp",
  },
  {
    name: "Ghazi",
    role: "Head of Technical",
    initials: "G",
    imageSrc: "/landing/founders/ghazi.webp",
  },
];

const beats = [
  {
    title: "It started with Yana.",
    body: "She was working at Petronas and had grown bored of corporate life. She left for hijab styling, the work she loved, and clients came quickly.",
  },
  {
    title: "A third of the work was admin.",
    body: "What she found is what most glam teams live with: about a third of the time goes to admin. She wanted a better way to run that work.",
  },
  {
    title: "Then she called Ghazi.",
    body: "Ghazi is a software engineer she had met and worked closely with a few years earlier. Together they set out to build the best software for glam teams.",
  },
];

function FounderPhoto({
  name,
  initials,
  imageSrc,
}: {
  name: string;
  initials: string;
  imageSrc: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative size-28 shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/25">
      <span
        className="absolute inset-0 flex items-center justify-center font-serif text-3xl text-rose-200 italic"
        aria-hidden
      >
        {initials}
      </span>
      <img
        src={imageSrc}
        alt={name}
        className={cn(
          "absolute inset-0 size-full object-cover transition-opacity",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
      />
    </div>
  );
}

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [mobile, setMobile] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();
    const trimmedMobile = mobile.trim();

    if (!trimmedName) {
      setError("Enter your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Enter a valid email.");
      return;
    }
    if (trimmedMobile && !isValidPhoneNumber(trimmedMobile)) {
      setError("Enter a valid phone number so we can reach you.");
      return;
    }
    if (!trimmedMessage) {
      setError("Write a message.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          country_code: trimmedMobile ? countryCode : "",
          mobile: trimmedMobile,
          message: trimmedMessage,
          website,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        message?: string;
        error?: unknown;
      } | null;

      if (!response.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Something went wrong. Please try again.",
        );
        return;
      }

      setSuccess(data?.message ?? "Thanks. We'll write back soon.");
      setName("");
      setEmail("");
      setMobile("");
      setMessage("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <input
        type="text"
        name="website"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <label className="block">
        <span className="text-sm text-zinc-300">Name</span>
        <input
          type="text"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={cn(fieldClassName, "mt-2")}
        />
      </label>
      <label className="block">
        <span className="text-sm text-zinc-300">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={cn(fieldClassName, "mt-2")}
        />
      </label>
      <div>
        <p className="text-sm text-zinc-300">Phone <span className="text-zinc-500">(optional)</span></p>
        <div className="mt-2">
          <PhoneNumberInput
            countryCode={countryCode}
            mobile={mobile}
            onCountryCodeChange={setCountryCode}
            onMobileChange={setMobile}
            mobileInputId="contact-phone"
            placeholder="Your phone number"
            countryCodeAriaLabel="Country code"
            mobileAriaLabel="Phone number"
            inputClassName={fieldClassName}
            selectTriggerClassName={selectTriggerClassName}
            selectContentClassName={selectContentClassName}
          />
        </div>
      </div>
      <label className="block">
        <span className="text-sm text-zinc-300">Message</span>
        <textarea
          name="message"
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={cn(fieldClassName, "mt-2 h-auto resize-y py-3")}
        />
      </label>
      <div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex rounded-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LiquidGlass
            tint={0.2}
            className={cn(
              GLASS_SHADOW,
              "text-white transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100",
            )}
            contentClassName="flex items-center gap-2 px-7 py-3.5 font-medium [text-shadow:0_1px_2px_rgb(0_0_0/0.25)]"
          >
            {submitting ? "Sending…" : "Send message"}
            <IconArrowRight className="size-4" aria-hidden />
          </LiquidGlass>
        </button>
      </div>
      {error ? (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-white" role="status">
          {success}
        </p>
      ) : null}
    </form>
  );
}

export function LandingAbout() {
  return (
    <>
      <section className="-mt-16">
        <div
          className="relative isolate w-full overflow-hidden"
          style={{ backgroundColor: PAGE_BG }}
        >
          <SatinRidges
            colors={["#961b45", "#ff6653"]}
            backgroundColor={PAGE_BG}
            angle={-33}
            scale={1.35}
            depth={1}
            warp={1}
            gloss={0.4}
            highlight={0.85}
            lightAngle={-70}
            sheen={0.65}
            speed={1}
            seed={12}
            clickRipples={false}
            dpr={1}
            detail={0}
            className="absolute inset-0 h-full w-full"
          />
          <div className="relative z-10 flex min-h-[78vh] flex-col justify-end px-4 pt-28 pb-16 md:px-8 md:pb-24">
            <div className="mx-auto w-full max-w-6xl">
              <p className="text-sm font-medium tracking-[0.18em] text-rose-200 uppercase">
                About us
              </p>
              <h1 className="mt-4 font-serif text-6xl leading-none tracking-tight text-rose-200 italic sm:text-7xl md:text-8xl">
                Our story
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-200 sm:text-lg">
                Our goal at Bridalync is to build the best system for glam teams
                in Malaysia.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:px-8 md:py-28">
        <ol className="mx-auto max-w-6xl border-y border-white/15">
          {beats.map((beat, index) => (
            <li
              key={beat.title}
              className="grid gap-4 border-b border-white/15 py-10 last:border-b-0 md:grid-cols-[6rem_minmax(0,1fr)] md:gap-16 md:py-16"
            >
              <p className="text-sm font-medium tracking-[0.16em] text-zinc-500">
                0{index + 1}
              </p>
              <div>
                <RevealMask>
                  <h2 className="max-w-[16ch] text-4xl font-medium leading-[1.05] tracking-tight text-white sm:text-5xl">
                    {beat.title}
                  </h2>
                </RevealMask>
                <FadeRise delay={0.12} y={16}>
                  <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
                    {beat.body}
                  </p>
                </FadeRise>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="contact" className="scroll-mt-24 px-4 pb-8 md:px-8">
        <div className="mx-auto max-w-6xl border-t border-white/15 py-16 md:py-24">
          <p className="text-sm font-medium tracking-[0.18em] text-rose-200 uppercase">
            Founders
          </p>
          <ul className="mt-10 grid gap-10 sm:grid-cols-2 sm:gap-16">
            {founders.map((founder, index) => (
              <li key={founder.name}>
                <FadeRise delay={index * 0.08} y={16}>
                  <div className="flex items-center gap-5">
                    <FounderPhoto
                      name={founder.name}
                      initials={founder.initials}
                      imageSrc={founder.imageSrc}
                    />
                    <div>
                      <p className="text-2xl font-medium tracking-tight text-white">
                        {founder.name}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">{founder.role}</p>
                    </div>
                  </div>
                </FadeRise>
              </li>
            ))}
          </ul>

          <div className="mt-20 grid items-start gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-x-20">
            <div>
              <RevealMask>
                <h2 className="max-w-[12ch] text-4xl font-medium leading-[1.05] tracking-tight text-white sm:text-5xl">
                  Contact us.
                </h2>
              </RevealMask>
              <FadeRise delay={0.12} y={16}>
                <p className="mt-5 max-w-xs text-base leading-relaxed text-zinc-400 sm:text-lg">
                  Leave your details and a message. We&apos;ll write back.
                </p>
              </FadeRise>
            </div>
            <FadeRise delay={0.16} y={16}>
              <ContactForm />
            </FadeRise>
          </div>
        </div>
      </section>
    </>
  );
}
