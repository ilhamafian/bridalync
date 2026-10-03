"use client";

import Image from "next/image";
import { useState } from "react";
import { IconTrash } from "@tabler/icons-react";

import { BackButton } from "@/components/dashboard/BackButton";
import { EmptyCard } from "@/components/dashboard/DashboardHome";
import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import { SettingsFeedback } from "@/components/dashboard/settings/SettingsUi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardReview } from "@/schemas/reviewSchema";
import { formatReviewEventDate } from "@/utils/reviews";

function DeleteReviewButton({
  review,
  deleting,
  onConfirm,
}: {
  review: DashboardReview;
  deleting: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="-mt-1 -mr-1 shrink-0 text-muted-foreground hover:text-destructive"
          disabled={deleting}
          aria-label={`Delete review from ${review.clientName}`}
        >
          <IconTrash />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this review?</AlertDialogTitle>
          <AlertDialogDescription>
            {review.clientName}&apos;s review will be removed from your public
            profile. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ReviewsManager({
  reviews,
  onReviewsChange,
}: {
  reviews: DashboardReview[];
  onReviewsChange: (reviews: DashboardReview[]) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setError(null);
    setSuccess(null);
    setDeletingId(id);

    try {
      const response = await fetch(`/api/dashboard/reviews/${id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not delete review."
        );
        return;
      }

      onReviewsChange(reviews.filter((review) => review._id !== id));
      setSuccess("Review removed.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <BackButton fallbackHref="/dashboard/profile" />

      <section>
        <h2 className="text-xl font-semibold tracking-tight">Reviews</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What clients said about you. These appear on your public profile.
        </p>
      </section>

      <SettingsFeedback error={error} success={success} />

      {reviews.length === 0 ? (
        <EmptyCard>
          No reviews yet. Send clients a review link from Completed bookings on
          Home.
        </EmptyCard>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((review) => (
            <li
              key={review._id}
              className={cn(glassCardClassName, "flex flex-col gap-3 p-4")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">
                    {review.clientName}
                  </p>
                  {review.event_date ? (
                    <p className="text-xs text-muted-foreground">
                      {formatReviewEventDate(review.event_date)}
                    </p>
                  ) : null}
                </div>
                <DeleteReviewButton
                  review={review}
                  deleting={deletingId === review._id}
                  onConfirm={() => void handleDelete(review._id)}
                />
              </div>
              {review.comment ? (
                <p className="text-sm whitespace-pre-line">{review.comment}</p>
              ) : null}
              {review.image_urls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {review.image_urls.map((url) => (
                    <div
                      key={url}
                      className="relative size-16 overflow-hidden rounded-xl bg-white/50 ring-1 ring-white/60 dark:bg-white/10 dark:ring-white/15"
                    >
                      <Image
                        src={url}
                        alt={`${review.clientName} review photo`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
