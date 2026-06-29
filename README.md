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
