"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SerializedBooking } from "@/utils/booking/serializeBooking";
import { formatRm } from "@/utils/booking/pricing";

type PendingItem = {
  booking: SerializedBooking;
  type: "deposit" | "balance";
  amountRm: number;
  receiptUrl?: string;
};

function toPendingItems(bookings: SerializedBooking[]): PendingItem[] {
  const items: PendingItem[] = [];

  for (const booking of bookings) {
    if (booking.depositVerificationStatus === "pending") {
      items.push({
        booking,
        type: "deposit",
        amountRm:
          booking.paymentOption === "full"
            ? booking.invoice.totalRm
            : booking.invoice.depositRm,
        receiptUrl: booking.depositReceiptUrl,
      });
    }
    if (booking.balanceVerificationStatus === "pending") {
      items.push({
        booking,
        type: "balance",
        amountRm: booking.invoice.balanceRm,
        receiptUrl: booking.balanceReceiptUrl,
      });
    }
  }

  return items;
}

export function AdminPaymentsManager() {
  const router = useRouter();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const me = await fetch("/api/admin/auth/me");
      if (!me.ok) {
        router.replace("/admin/login");
        return;
      }
      const meData = (await me.json()) as { email?: string };
      setAdminEmail(meData.email ?? null);

      const response = await fetch(
        "/api/admin/bookings/pending-verification"
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not load pending payments."
        );
        return;
      }

      setItems(toPendingItems((data.bookings ?? []) as SerializedBooking[]));
    } catch {
      setError("Could not load pending payments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  async function verify(
    bookingId: string,
    type: "deposit" | "balance",
    action: "approve" | "reject"
  ) {
    const key = `${bookingId}:${type}:${action}`;
    setActingKey(key);
    setError(null);

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, type }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : `Could not ${action} payment.`
        );
        return;
      }

      await loadQueue();
    } finally {
      setActingKey(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Payment verification</h1>
          <p className="text-sm text-muted-foreground">
            Review manual transfer receipts before confirming bookings.
            {adminEmail ? ` Signed in as ${adminEmail}.` : null}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void loadQueue()}>
            Refresh
          </Button>
          <Button type="button" variant="ghost" onClick={() => void handleLogout()}>
            Sign out
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading queue…</p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>All caught up</CardTitle>
            <CardDescription>
              There are no payments waiting for verification.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4">
        {items.map((item) => {
          const approveKey = `${item.booking._id}:${item.type}:approve`;
          const rejectKey = `${item.booking._id}:${item.type}:reject`;

          return (
            <Card key={`${item.booking._id}-${item.type}`}>
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">
                    {item.booking.contact.name}
                  </CardTitle>
                  <Badge variant="secondary">
                    {item.type === "deposit" ? "Deposit" : "Balance"}
                  </Badge>
                </div>
                <CardDescription>
                  {item.booking.freelancerUsername} · {item.booking.packageNames} ·{" "}
                  {formatRm(item.amountRm)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="text-sm text-muted-foreground">
                  <p>{item.booking.contact.email}</p>
                  <p>
                    Submitted{" "}
                    {item.booking.created_at
                      ? new Date(item.booking.created_at).toLocaleString("en-MY")
                      : "—"}
                  </p>
                </div>

                {item.receiptUrl ? (
                  <a
                    href={item.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block aspect-video w-full max-w-md overflow-hidden rounded-md border border-border"
                  >
                    <Image
                      src={item.receiptUrl}
                      alt="Payment receipt"
                      fill
                      className="object-contain bg-muted/20"
                      unoptimized
                    />
                  </a>
                ) : (
                  <p className="text-sm text-destructive">No receipt uploaded.</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={actingKey !== null}
                    onClick={() =>
                      void verify(item.booking._id, item.type, "approve")
                    }
                  >
                    {actingKey === approveKey ? "Approving…" : "Approve"}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={actingKey !== null}
                    onClick={() =>
                      void verify(item.booking._id, item.type, "reject")
                    }
                  >
                    {actingKey === rejectKey ? "Rejecting…" : "Reject"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
