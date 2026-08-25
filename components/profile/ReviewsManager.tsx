"use client";

import Image from "next/image";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { IconPlus, IconTrash, IconUpload } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DashboardReview } from "@/schemas/reviewSchema";
import { formatReviewEventDate } from "@/utils/reviews";

const MAX_REVIEW_IMAGES = 5;

const inputClassName = cn(
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

const textareaClassName = cn(
  "min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
);

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function ReviewsManager({
  initialReviews,
}: {
  initialReviews: DashboardReview[];
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [clientName, setClientName] = useState("");
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [eventDateOpen, setEventDateOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    const remaining = MAX_REVIEW_IMAGES - imageUrls.length;
    if (remaining <= 0) {
      setError(`You can upload up to ${MAX_REVIEW_IMAGES} images.`);
      return;
    }

    const toUpload = files.slice(0, remaining);
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const uploaded: string[] = [];
      for (const file of toUpload) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "review-images");

        const response = await fetch("/api/upload/image", {
          method: "POST",
          body: formData,
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || typeof data.url !== "string") {
          setError(
            typeof data.error === "string"
              ? data.error
              : "Could not upload image."
          );
          break;
        }
        uploaded.push(data.url);
      }

      if (uploaded.length > 0) {
        setImageUrls((prev) =>
          [...prev, ...uploaded].slice(0, MAX_REVIEW_IMAGES)
        );
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleAdd() {
    setError(null);
    setSuccess(null);

    if (!clientName.trim()) {
      setError("Client name is required.");
      return;
    }
    if (!eventDate) {
      setError("Event date is required.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/dashboard/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          event_date: toDateInputValue(eventDate),
          comment: comment.trim() || undefined,
          image_urls: imageUrls,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not add review."
        );
        return;
      }

      const created = data.review as DashboardReview;
      setReviews((prev) => [created, ...prev]);
      setClientName("");
      setEventDate(undefined);
      setComment("");
      setImageUrls([]);
      setSuccess("Review added to your public profile.");
    } finally {
      setSaving(false);
    }
  }

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

      setReviews((prev) => prev.filter((review) => review._id !== id));
      setSuccess("Review removed.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Add a review</CardTitle>
          <CardDescription>
            Add client testimonials and photos to show on your public profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Client name" htmlFor="manual-review-name">
            <Input
              id="manual-review-name"
              className={inputClassName}
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Sarah A."
            />
          </Field>

          <Field label="Event date">
            <Popover open={eventDateOpen} onOpenChange={setEventDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="manual-review-event-date"
                  type="button"
                  variant="outline"
                  disabled={saving || uploading}
                  className={cn(
                    "h-10 w-full justify-start rounded-md px-3 text-left font-normal",
                    !eventDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="size-4" />
                  {eventDate ? format(eventDate, "d MMM yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={eventDate}
                  captionLayout="dropdown"
                  disabled={{ after: new Date() }}
                  onSelect={(date) => {
                    setEventDate(date);
                    setEventDateOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              When this client’s event took place.
            </p>
          </Field>

          <Field label="Comment (optional)" htmlFor="manual-review-comment">
            <textarea
              id="manual-review-comment"
              className={textareaClassName}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="What they said about your work…"
            />
          </Field>

          <Field label="Photos (optional)">
            <div className="flex flex-col gap-3">
              {imageUrls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {imageUrls.map((url) => (
                    <div
                      key={url}
                      className="relative size-20 overflow-hidden rounded-md border bg-muted"
                    >
                      <Image
                        src={url}
                        alt="Review photo"
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                      <button
                        type="button"
                        className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground shadow-sm hover:text-destructive"
                        aria-label="Remove photo"
                        disabled={saving || uploading}
                        onClick={() =>
                          setImageUrls((prev) =>
                            prev.filter((item) => item !== url)
                          )
                        }
                      >
                        <IconTrash className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    saving ||
                    uploading ||
                    imageUrls.length >= MAX_REVIEW_IMAGES
                  }
                  onClick={() => imageInputRef.current?.click()}
                >
                  <IconUpload />
                  {uploading
                    ? "Uploading…"
                    : `Add photos (${imageUrls.length}/${MAX_REVIEW_IMAGES})`}
                </Button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Up to {MAX_REVIEW_IMAGES} images. JPEG, PNG, WebP, or GIF up to
                4 MB each.
              </p>
            </div>
          </Field>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {success ? (
            <p className="text-sm text-muted-foreground">{success}</p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            onClick={handleAdd}
            disabled={saving || uploading}
          >
            <IconPlus />
            {saving ? "Adding…" : "Add review"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your reviews</CardTitle>
          <CardDescription>
            These appear on your public booking profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No reviews yet. Add testimonials above.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {reviews.map((review) => (
                <li
                  key={review._id}
                  className="flex items-start justify-between gap-3 border-b border-border pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {review.clientName}
                    </p>
                    {review.event_date ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatReviewEventDate(review.event_date)}
                      </p>
                    ) : null}
                    {review.comment ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {review.comment}
                      </p>
                    ) : null}
                    {(review.image_urls?.length ?? 0) > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {review.image_urls.map((url) => (
                          <div
                            key={url}
                            className="relative size-16 overflow-hidden rounded-md border bg-muted"
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
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === review._id}
                    onClick={() => void handleDelete(review._id)}
                    aria-label={`Delete review from ${review.clientName}`}
                  >
                    <IconTrash />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
