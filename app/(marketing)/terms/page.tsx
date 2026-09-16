import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service | Bridalync",
  description:
    "Terms governing your use of Bridalync, including account access and Google Sign-In.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Terms of Service" effectiveDate="16 September 2026">
      <section>
        <h2>1. Agreement</h2>
        <p>
          These Terms of Service (“Terms”) govern your access to and use of
          Bridalync (the “Service”), operated by BRIDALYNC SERVICES
          (Registration No. 202603170540 (LA0090837-D)) (“Bridalync”, “we”,
          “us”, or “our”).
        </p>
        <p>
          By creating an account, signing in (including with Google), or
          otherwise using the Service, you agree to these Terms and our{" "}
          <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do
          not use the Service.
        </p>
      </section>

      <section>
        <h2>2. The Service</h2>
        <p>
          Bridalync is a platform for bridal hair and makeup artists and related
          freelancers to manage bookings, availability, client information,
          packages, and payments. Features may change over time as we improve
          the product.
        </p>
      </section>

      <section>
        <h2>3. Eligibility</h2>
        <p>
          You must be at least 18 years old (or the age of majority in your
          jurisdiction) and able to form a binding contract to use Bridalync as
          a business user. You are responsible for ensuring your use complies
          with applicable laws.
        </p>
      </section>

      <section>
        <h2>4. Accounts and Google Sign-In</h2>
        <p>
          You must provide accurate account information and keep it up to date.
          You are responsible for safeguarding your login credentials and for
          activity under your account.
        </p>
        <p>
          If you sign in with Google, you authorize Bridalync to receive basic
          profile information from Google as described in our Privacy Policy.
          Your use of Google Sign-In is also subject to Google’s terms and
          policies. You can revoke Bridalync’s access to your Google account at
          any time through your Google Account settings.
        </p>
        <p>
          Notify us promptly at{" "}
          <a href="mailto:pacificventures.hq@gmail.com">pacificventures.hq@gmail.com</a> if you
          suspect unauthorized access to your account.
        </p>
      </section>

      <section>
        <h2>5. Your content and responsibilities</h2>
        <p>
          You retain ownership of content you upload (such as profile photos,
          logos, package descriptions, and booking details). You grant us a
          limited license to host, process, and display that content as needed
          to operate the Service.
        </p>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for unlawful, fraudulent, or harmful purposes</li>
          <li>Upload content you do not have the right to use</li>
          <li>Attempt to disrupt, reverse engineer, or gain unauthorized access to the Service</li>
          <li>Misrepresent your identity or business</li>
          <li>Interfere with other users’ use of the Service</li>
        </ul>
      </section>

      <section>
        <h2>6. Bookings and client relationships</h2>
        <p>
          Bridalync helps you manage bookings, but the service relationship for
          hair, makeup, and related services is between you and your clients,
          unless we expressly state otherwise. You are responsible for your
          pricing, availability, cancellations, and client communications.
        </p>
      </section>

      <section>
        <h2>7. Payments</h2>
        <p>
          Payment features may include bank transfer workflows and/or
          third-party processors such as Stripe. Fees, payout timing, and
          payment methods depend on the options you enable and the processor’s
          terms. You are responsible for taxes applicable to your business.
        </p>
      </section>

      <section>
        <h2>8. Intellectual property</h2>
        <p>
          The Service, including its branding, design, and software, is owned by
          Bridalync or its licensors. These Terms do not grant you any right to
          use our trademarks except as needed to identify your use of the
          Service in a truthful way.
        </p>
      </section>

      <section>
        <h2>9. Third-party services</h2>
        <p>
          The Service may integrate with third parties (for example Google for
          authentication or maps, Stripe for payments, and email providers).
          Those services are governed by their own terms and privacy policies.
          We are not responsible for third-party services we do not control.
        </p>
      </section>

      <section>
        <h2>10. Disclaimer</h2>
        <p>
          The Service is provided on an “as is” and “as available” basis. To the
          fullest extent permitted by law, we disclaim warranties of
          merchantability, fitness for a particular purpose, and
          non-infringement. We do not guarantee that the Service will be
          uninterrupted, error-free, or completely secure.
        </p>
      </section>

      <section>
        <h2>11. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, Bridalync and its operators
          will not be liable for indirect, incidental, special, consequential,
          or punitive damages, or for lost profits, revenue, data, or business
          opportunities, arising from your use of the Service. Our total
          liability for any claim relating to the Service will not exceed the
          amounts you paid us for the Service in the twelve (12) months before
          the claim (or, if none, RM100).
        </p>
      </section>

      <section>
        <h2>12. Suspension and termination</h2>
        <p>
          You may stop using the Service at any time. We may suspend or
          terminate access if you breach these Terms, if required by law, or if
          we discontinue the Service. Provisions that by nature should survive
          (including intellectual property, disclaimers, and liability limits)
          will survive termination.
        </p>
      </section>

      <section>
        <h2>13. Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. We will post the updated
          version on this page and update the effective date. Continued use of
          the Service after changes take effect constitutes acceptance of the
          revised Terms.
        </p>
      </section>

      <section>
        <h2>14. Governing law</h2>
        <p>
          These Terms are governed by the laws of Malaysia, without regard to
          conflict-of-law principles. Courts in Malaysia shall have exclusive
          jurisdiction, subject to any mandatory consumer protections that
          cannot be waived.
        </p>
      </section>

      <section>
        <h2>15. Contact</h2>
        <p>
          Questions about these Terms:{" "}
          <a href="mailto:pacificventures.hq@gmail.com">pacificventures.hq@gmail.com</a>.
        </p>
        <p>
          Privacy details:{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>
    </LegalPage>
  );
}
