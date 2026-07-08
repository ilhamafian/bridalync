# Bridalync

A web app for glam team freelancers—makeup artists, hijab stylists, hair stylists, and similar wedding-day professionals—to manage clients and schedule appointments in one place.

## What it does

Bridalync is built for independent freelancers who juggle multiple bridal clients, trial sessions, and event-day bookings. Instead of scattered notes, DMs, and spreadsheets, the goal is a single workspace to:

- **Manage clients** — contact details, wedding date, venue, service type, notes, and package/pricing
- **Let clients self-book** — a Calendly-style flow where clients pick available slots themselves
- **Stay on top of the day** — calendar, reminders, payments, availability rules, and earnings reports

## Who it's for

- Makeup artists (MUA)
- Hijab stylists
- Hair stylists
- Other wedding glam freelancers who work client-by-client on flexible schedules

## Product direction

| Area | Plan |
| --- | --- |
| **Accounts** | One freelancer per account |
| **Auth** | Email + password |
| **Booking** | Client self-booking from a public link |
| **Client portal** | `app/[client]` — client-facing portal to view appointments, confirm, and share details |
| **Availability** | Blocked days, travel/buffer time between jobs, max clients per day, separate trial vs wedding-day slots |
| **Audience** | Malaysia — English / Malay |
| **Database** | MongoDB (Atlas) |

### Planned features

- Calendar and appointment scheduling
- Client self-booking with availability rules
- Reminders (WhatsApp, SMS, or email)
- Deposits, payments, and invoicing
- Reports and earnings overview

## Current status

Early development. The app currently includes a calendar date picker as the first building block toward scheduling. Client portal, authentication, MongoDB persistence, and self-booking are planned next.

## Tech stack

- [Next.js](https://nextjs.org) (App Router)
- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [MongoDB](https://www.mongodb.com) (Atlas) — planned

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `DB_NAME` | Yes | Database name |
| `APP_URL` | Yes | Public app URL (e.g. `http://localhost:3000`) |
| `AUTH_SECRET` | Yes | Session signing secret |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key for client-side Stripe.js |
| `STRIPE_WEBHOOK_SECRET` | Yes (Connect) | Webhook signing secret from the Stripe Dashboard |

### Stripe Connect setup

Malaysia-based platforms use **Stripe Standard** connected accounts (Accounts v1) with hosted Account Link onboarding. Express and marketplace-style configs make the platform loss-liable, which Stripe blocks for MY platforms. See `utils/stripe/connect.ts`.

1. Complete [Connect platform setup](https://dashboard.stripe.com/connect) in your Stripe Dashboard.
2. Enable **Accounts v2** under [Account previews](https://dashboard.stripe.com/settings/previews).
3. Configure Connect branding (name, color, icon) under Connect settings.
4. Add a webhook endpoint pointing to `{APP_URL}/api/stripe/webhooks`.
   - Enable **Listen to events on Connected accounts** (required for direct charges on Standard accounts).
   - Subscribe to:
     - `checkout.session.completed`
     - `checkout.session.expired`
     - `payment_intent.succeeded`
     - `account.updated`
5. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

For local webhook testing, use the [Stripe CLI](https://docs.stripe.com/stripe-cli). Client payments run on the **connected account**, so you must forward Connect events too:

```bash
stripe listen \
  --forward-to localhost:3000/api/stripe/webhooks \
  --forward-connect-to localhost:3000/api/stripe/webhooks
```

Use the `whsec_...` secret printed by the CLI in `STRIPE_WEBHOOK_SECRET` (not the Dashboard secret while using the CLI).

## Getting started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Other scripts:

```bash
npm run build   # production build
npm run start   # start production server
npm run lint    # run ESLint
```
