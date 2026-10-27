import { landingGlassClassName } from "@/components/landing/glass";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

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
    <section id="faq" className="scroll-mt-24 px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
          FAQ
        </h2>
        <Accordion
          type="single"
          collapsible
          className={cn(landingGlassClassName, "border-white/60")}
        >
          {faqs.map((faq, index) => (
            <AccordionItem
              key={faq.question}
              value={`faq-${index}`}
              className="border-white/50 px-4 data-open:bg-white/20 md:px-6"
            >
              <AccordionTrigger className="py-4 text-sm text-zinc-900 hover:no-underline md:text-base">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-zinc-700">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
