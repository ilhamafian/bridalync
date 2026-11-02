"use client";

import { ChevronRight, Plus } from "lucide-react";
import { Accordion } from "radix-ui";

import { SITE_CONTACT_EMAIL } from "@/lib/site";

const faqs = [
  {
    question: "What is Bridalync?",
    answer:
      "Bridalync is one app for glam teams to take bookings, plan sessions, and track payments. Clients book from your link, and you see the schedule, receipts, and what's still owed in one place.",
  },
  {
    question: "Who is it for?",
    answer:
      "Makeup artists, hijab stylists, hairstylists, and bride assistants who take bridal bookings. You set your events, styles, travel fees, and the dates you can work.",
  },
  {
    question: "How do clients book me?",
    answer:
      "Share your profile link. Clients choose an event, date, time, and look, add their details, and pay a deposit or the full amount. You get a notification as soon as a request or payment comes in.",
  },
  {
    question: "How do payments work?",
    answer:
      "You can take payment through a payment gateway or by manual transfer with your QR and bank details. Deposits, balances, and receipts stay on the booking, and you can download an invoice.",
  },
  {
    question: "When can I start using it?",
    answer:
      "Bridalync is in closed beta. Join the waitlist with your number and we'll reach out with a personalised demo when a spot opens.",
  },
];

export function LandingFaq() {
  return (
    <section id="faq" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-x-20">
        <div>
          {/* <p className="inline-flex items-center gap-0.5 text-sm font-medium text-blue-400">
            Questions
            <ChevronRight className="size-3.5" aria-hidden />
          </p> */}
          <h2 className="mt-6 max-w-[14ch] text-4xl font-medium leading-[1.05] tracking-tight text-white sm:text-5xl lg:max-w-[12ch] lg:text-[3.25rem]">
            Everything people ask before joining.
          </h2>
          <p className="mt-6 max-w-xs text-base leading-relaxed text-zinc-400">
            Something missing?{" "}
            <a
              href={`mailto:${SITE_CONTACT_EMAIL}`}
              className="underline decoration-zinc-500 underline-offset-4 transition-colors hover:text-zinc-200"
            >
              Write to us
            </a>{" "}
            and a human answers within a day.
          </p>
        </div>

        <Accordion.Root
          type="single"
          collapsible
          defaultValue="faq-0"
          className="border-t border-white/15 lg:mt-12"
        >
          {faqs.map((faq, index) => (
            <Accordion.Item
              key={faq.question}
              value={`faq-${index}`}
              className="border-b border-white/15"
            >
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-start justify-between gap-6 py-5 text-left text-base font-medium text-zinc-50 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/30">
                  {faq.question}
                  <Plus
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-zinc-300 transition-transform duration-300 ease-out group-data-[state=open]:rotate-45 motion-reduce:transition-none"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden text-[15px] leading-relaxed text-zinc-400 data-closed:animate-faq-up data-open:animate-faq-down motion-reduce:animate-none">
                <p className="max-w-xl pb-5 pr-10">{faq.answer}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
