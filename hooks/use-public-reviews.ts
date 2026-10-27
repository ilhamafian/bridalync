"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import type { PublicReview } from "@/schemas/reviewSchema";

const PAGE_SIZE = 5;

type ReviewsPage = {
  reviews: PublicReview[];
  hasMore: boolean;
};

async function fetchReviewsPage(
  username: string,
  offset: number,
  signal?: AbortSignal
): Promise<ReviewsPage> {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(PAGE_SIZE),
  });
  const response = await fetch(
    `/api/client/${encodeURIComponent(username)}/reviews?${params}`,
    { signal }
  );
  if (!response.ok) throw new Error(`Status ${response.status}`);
  const data = (await response.json()) as {
    reviews?: PublicReview[];
    hasMore?: boolean;
  };
  return {
    reviews: data.reviews ?? [],
    hasMore: data.hasMore === true,
  };
}

/**
 * Loads a freelancer's public reviews a page at a time. The first page starts
 * immediately. Later pages load when `sentinelRef` nears the scroll container.
 */
export function usePublicReviews(
  username: string,
  scrollRootRef?: RefObject<HTMLElement | null>
) {
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
      const page = await fetchReviewsPage(username, offsetRef.current);
      offsetRef.current += page.reviews.length;
      setReviews((current) => {
        const seen = new Set(current.map((review) => review._id));
        return [
          ...current,
          ...page.reviews.filter((review) => !seen.has(review._id)),
        ];
      });
      setHasMore(page.hasMore);
    } catch (error) {
      console.error(error);
      setFailed(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    offsetRef.current = 0;
    setReviews([]);
    setHasMore(true);
    setFailed(false);
    setLoading(true);
    loadingRef.current = true;

    void (async () => {
      try {
        const page = await fetchReviewsPage(username, 0, controller.signal);
        if (cancelled) return;
        offsetRef.current = page.reviews.length;
        setReviews(page.reviews);
        setHasMore(page.hasMore);
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        console.error(error);
        setFailed(true);
      } finally {
        if (!cancelled) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      loadingRef.current = false;
      controller.abort();
    };
  }, [username]);

  useEffect(() => {
    // The first page is already in flight. This only pulls the next page.
    if (!sentinel || !hasMore || loading || failed || reviews.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      {
        root: scrollRootRef?.current ?? null,
        rootMargin: "300px 0px",
      }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    sentinel,
    hasMore,
    loading,
    failed,
    loadMore,
    reviews.length,
    scrollRootRef,
  ]);

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
