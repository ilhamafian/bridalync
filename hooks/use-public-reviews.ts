"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { PublicReview } from "@/schemas/reviewSchema";

const PAGE_SIZE = 5;

/**
 * Loads a freelancer's public reviews a page at a time, starting only once the
 * returned sentinel ref scrolls near the viewport.
 */
export function usePublicReviews(username: string) {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null);
  const loadingRef = useRef(false);
  const offsetRef = useRef(0);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setFailed(false);

    try {
      const params = new URLSearchParams({
        offset: String(offsetRef.current),
        limit: String(PAGE_SIZE),
      });
      const response = await fetch(
        `/api/client/${encodeURIComponent(username)}/reviews?${params}`
      );
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = (await response.json()) as {
        reviews?: PublicReview[];
        hasMore?: boolean;
      };
      const page = data.reviews ?? [];
      offsetRef.current += page.length;
      setReviews((current) => {
        const seen = new Set(current.map((review) => review._id));
        return [...current, ...page.filter((review) => !seen.has(review._id))];
      });
      setHasMore(data.hasMore === true);
    } catch (error) {
      console.error(error);
      setFailed(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (!sentinel || !hasMore || loading || failed) return;

    // Recreated after every page, so the initial callback re-checks whether the
    // sentinel is still visible (e.g. a short first page on a tall screen).
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel, hasMore, loading, failed, loadMore, reviews.length]);

  return {
    items: reviews,
    hasMore,
    loading,
    failed,
    retry: loadMore,
    sentinelRef: setSentinel,
  };
}

export type PublicReviewsState = ReturnType<typeof usePublicReviews>;
