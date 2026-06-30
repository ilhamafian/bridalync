"use client"

import { notFound } from "next/navigation"
import { use, useEffect, useMemo, useState } from "react"
import { CheckCircle2Icon, XCircleIcon } from "lucide-react"

import { BookingInvoice } from "@/components/BookingInvoice"
import { BookingSessionList } from "@/components/BookingSessionList"
import { Button } from "@/components/ui/button"
import {
  buildBookingResultMessage,
  buildWhatsAppUrl,
} from "@/utils/booking/messages"
import { formatRm } from "@/utils/booking/pricing"
import { getPackageLabel, getStyleLabel } from "@/utils/booking/utils"
import type { PublicBooking } from "@/schemas/booking-record"
import type { BookingFreelancer } from "@/schemas/freelancer"

export default function BookingResultPage({
  params,
}: {
  params: Promise<{ client: string; id: string }>
}) {
  const { client, id } = use(params)
  const [booking, setBooking] = useState<(PublicBooking & { _id: string }) | null>(
    null
  )
  const [freelancer, setFreelancer] = useState<BookingFreelancer | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound_, setNotFound] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/bookings/${id}?client=${encodeURIComponent(client)}`),
      fetch(`/api/freelancers/${client}`),
    ])
      .then(async ([bookingRes, freelancerRes]) => {
        if (bookingRes.status === 404) {
          setNotFound(true)
          return
        }

        const bookingData = bookingRes.ok ? await bookingRes.json() : null
        const freelancerData =
          freelancerRes.status === 404 ? null : await freelancerRes.json()

        if (bookingData) setBooking(bookingData)
        if (freelancerData) setFreelancer(freelancerData)
      })
      .finally(() => setLoading(false))
  }, [client, id])

  const whatsAppUrl = useMemo(() => {
    if (!booking || !freelancer?.mobile || !freelancer.country_code) {
      return null
    }

    const message = buildBookingResultMessage(freelancer.name, booking)
    return buildWhatsAppUrl(
      freelancer.country_code,
      freelancer.mobile,
      message
    )
  }, [booking, freelancer])

  if (notFound_) notFound()

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading booking...</p>
      </div>
    )
  }

  if (!booking) notFound()

  const isSuccess = booking.status === "confirmed"
  const isFailure = booking.status === "failed"
  const isPending = booking.status === "pending"

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-zinc-50 px-6 pt-16 pb-16 dark:bg-zinc-950">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          {isSuccess && (
            <CheckCircle2Icon className="size-12 text-emerald-600 dark:text-emerald-400" />
          )}
          {isFailure && (
            <XCircleIcon className="size-12 text-destructive" />
          )}
          {isPending && (
            <div className="size-12 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
          )}

          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {isSuccess && "Booking confirmed"}
            {isFailure && "Payment failed"}
            {isPending && "Booking pending"}
          </h1>

          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isSuccess &&
              `Your deposit of ${formatRm(booking.invoice.depositRm)} was received. The remaining balance is due before your session.`}
            {isFailure &&
              "We couldn't process your deposit. You can try booking again or contact the stylist."}
            {isPending &&
              "Your booking is awaiting payment confirmation."}
          </p>
        </div>

        <div className="w-full space-y-2">
          <p className="text-sm font-medium text-foreground">Booking details</p>
          <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
            <p className="font-medium text-foreground">
              {getPackageLabel(booking.packageId)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Style: {getStyleLabel(booking.style)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {booking.contact.name} · {booking.contact.phone}
            </p>
          </div>
        </div>

        <div className="w-full space-y-2">
          <p className="text-sm font-medium text-foreground">Sessions</p>
          <BookingSessionList sessions={booking.sessions} showLocation />
        </div>

        <BookingInvoice invoice={booking.invoice} />

        <div className="flex w-full flex-col gap-2">
          {isFailure && (
            <Button
              asChild
              size="lg"
              className="h-11 w-full bg-chart-4 text-white hover:bg-chart-4/90"
            >
              <a href={`/${client}`}>Try again</a>
            </Button>
          )}
          {whatsAppUrl ? (
            <Button
              asChild
              variant={isFailure ? "outline" : "default"}
              size="lg"
              className={
                isFailure
                  ? "h-11 w-full"
                  : "h-11 w-full bg-chart-4 text-white hover:bg-chart-4/90"
              }
            >
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            </Button>
          ) : (
            <Button size="lg" disabled className="h-11 w-full">
              WhatsApp unavailable
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
