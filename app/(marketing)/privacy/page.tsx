import type { Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";
import { LEGAL_URLS, SITE_CONTACT_EMAIL, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy | Bridalync",
  description:
    "How Bridalync collects, uses, and protects personal information, including when you sign in with Google.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" effectiveDate="16 September 2026">
      <section>
        <h2>1. Who we are</h2>
        <p>
          Bridalync (“we”, “us”, or “our”) is operated by BRIDALYNC SERVICES
          (Registration No. 202603170540 (LA0090837-D)). We provide an online
          platform for bridal hair and makeup artists to manage bookings,
          clients, and related business tools.
        </p>
        <p>
          Contact:{" "}
          <a href={`mailto:${SITE_CONTACT_EMAIL}`}>{SITE_CONTACT_EMAIL}</a>
        </p>
        <p>
          Website:{" "}
          <a href={SITE_URL} rel="noopener noreferrer">
            {SITE_URL.replace("https://", "")}
          </a>
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <p>Depending on how you use Bridalync, we may collect:</p>
        <ul>
          <li>
            <strong>Account information</strong> — name, email address, username,
            phone number, password (stored in hashed form), language preference,
            and profile or business details you provide.
          </li>
          <li>
            <strong>Google Sign-In information</strong> — if you choose to sign
            in with Google, we receive basic profile information from Google
            such as your name, email address, and profile picture (if available),
            subject to your Google account settings and consent.
          </li>
          <li>
            <strong>Google Calendar information</strong> — if you connect Google
            Calendar to import bookings, we read event titles and start/end
            times. We do not import public holidays, repeating events, or
            write back to Google Calendar.
          </li>
          <li>
            <strong>Booking and client information</strong> — details needed to
            create and manage bookings (for example client name, contact
            details, event dates, locations, and package selections).
          </li>
          <li>
            <strong>Payment-related information</strong> — payment status,
            receipts you upload, and identifiers from payment providers. Card
            and bank details for card payments are processed by Stripe; we do
            not store full card numbers.
          </li>
          <li>
            <strong>Device and usage information</strong> — such as session
            cookies needed to keep you signed in, and (if you enable them) web
            push notification subscription details.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How we use your information</h2>
        <p>We use personal information to:</p>
        <ul>
          <li>Create and manage your Bridalync account</li>
          <li>Authenticate you, including via Google Sign-In when enabled</li>
          <li>Import selected Google Calendar events as bookings when you request it</li>
          <li>Provide booking, scheduling, invoicing, and related features</li>
          <li>Process payments and verify payment receipts</li>
          <li>Send transactional emails (verification codes, booking updates, reminders)</li>
          <li>Operate, maintain, and improve the Service</li>
          <li>Comply with legal obligations and protect against misuse</li>
        </ul>
        <p>
          We do not sell your personal information. We do not use Google user
          data for advertising or sell it to third parties.
        </p>
      </section>

      <section>
        <h2>4. Google user data</h2>
        <p>
          When you choose “Continue with Google,” Bridalync requests basic
          Google account profile information (typically your name, email
          address, and profile picture) for the sole purposes of signing you
          in, creating or linking your Bridalync account, and showing your
          identity inside the Service.
        </p>
        <p>
          If you later connect Google Calendar from the dashboard, we request
          read-only access to your calendars so we can import one-off event
          titles and times as Bridalync bookings. We skip public holiday
          calendars and repeating events. We do not write to your Google
          Calendar. Event locations are not imported; you can add them later
          in Bridalync.
        </p>
        <p>
          We do <strong>not</strong> use Google user data for advertising, do
          not sell it, do not share it with data brokers, and do not use it for
          independent AI/ML training. We store the account identifiers needed to
          keep you signed in and to associate your Bridalync profile with your
          Google login. Imported calendar events are stored as bookings you
          control in Bridalync. We access only the scopes you authorize.
        </p>
        <p>
          Our use of information received from Google APIs will adhere to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </section>

      <section>
        <h2>5. How we share information</h2>
        <p>We may share information with:</p>
        <ul>
          <li>
            <strong>Service providers</strong> who help us run Bridalync (for
            example hosting, database, email delivery, file storage, maps, and
            payment processing), under appropriate confidentiality and security
            arrangements
          </li>
          <li>
            <strong>Payment processors</strong> such as Stripe, when you or your
            clients make payments through the platform
          </li>
          <li>
            <strong>Authorities</strong> when required by law or to protect
            rights, safety, and security
          </li>
        </ul>
        <p>
          Freelancers who use Bridalync may also receive client booking details
          they need to deliver their services.
        </p>
      </section>

      <section>
        <h2>6. Cookies and sessions</h2>
        <p>
          We use essential cookies and similar technologies to keep you signed
          in and operate core features of the Service. These are not used for
          third-party advertising.
        </p>
      </section>

      <section>
        <h2>7. Data retention</h2>
        <p>
          We retain personal information for as long as needed to provide the
          Service, meet legal or accounting requirements, resolve disputes, and
          enforce our agreements. You may request deletion of your account by
          contacting us.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          We take reasonable technical and organizational measures to protect
          personal information. No method of transmission or storage is
          completely secure, and we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>9. Your choices and rights</h2>
        <p>Depending on applicable law, you may have the right to:</p>
        <ul>
          <li>Access, correct, or update your personal information</li>
          <li>Request deletion of your account or certain data</li>
          <li>Withdraw consent where processing is based on consent</li>
          <li>
            Manage Google account permissions through your Google Account
            settings
          </li>
        </ul>
        <p>
          To make a request, email{" "}
          <a href={`mailto:${SITE_CONTACT_EMAIL}`}>{SITE_CONTACT_EMAIL}</a>.
        </p>
      </section>

      <section>
        <h2>10. Children’s privacy</h2>
        <p>
          Bridalync is intended for business and adult users. We do not
          knowingly collect personal information from children under 13 (or the
          equivalent minimum age in your jurisdiction).
        </p>
      </section>

      <section>
        <h2>11. International transfers</h2>
        <p>
          Your information may be processed in countries other than where you
          live, including where our service providers operate. We take steps
          intended to ensure appropriate safeguards are in place.
        </p>
      </section>

      <section>
        <h2>12. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will post the
          updated version on this page and revise the effective date above.
          Continued use of the Service after changes means you accept the
          updated policy.
        </p>
      </section>

      <section>
        <h2>13. Contact us</h2>
        <p>
          Questions about this Privacy Policy or your personal data:{" "}
          <a href={`mailto:${SITE_CONTACT_EMAIL}`}>{SITE_CONTACT_EMAIL}</a>.
        </p>
        <p>
          See also our{" "}
          <a href={LEGAL_URLS.terms}>Terms of Service</a>.
        </p>
      </section>
    </LegalPage>
  );
}
