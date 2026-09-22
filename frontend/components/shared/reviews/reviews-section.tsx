// Reviews section — summary plus paginated list for provider profiles

"use client";

import { useCallback, useEffect, useState } from "react";

import { getProviderReviews, INITIAL_REVIEWS_LIMIT, REVIEWS_PAGE_SIZE } from "@/api/client/reviews";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type {
  ProviderReview,
  ReviewsSummary,
} from "@/lib/client/reviews/types";
import ReviewList from "./review-list";
import ReviewSummary from "./review-summary";

type ReviewsSectionProps = {
  providerUserId: string;
  initialSummary: ReviewsSummary;
};

function toSectionError(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function ReviewsSection({
  providerUserId,
  initialSummary,
}: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [limit, setLimit] = useState(INITIAL_REVIEWS_LIMIT);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadReviews = useCallback(
    async (nextLimit: number, append: boolean) => {
      const fetched = await getProviderReviews(providerUserId, nextLimit);
      // Backend caps the page; a full page hints at more reviews available
      setHasMore(fetched.length >= nextLimit && fetched.length > 0);

      if (append) {
        setReviews((current) => {
          const known = new Set(current.map((review) => review.id));
          return [...current, ...fetched.filter((review) => !known.has(review.id))];
        });
      } else {
        setReviews(fetched);
      }
    },
    [providerUserId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setIsLoading(true);
      setError(null);

      try {
        await loadReviews(INITIAL_REVIEWS_LIMIT, false);
      } catch (err) {
        if (!cancelled) {
          setError(toSectionError(err, "Não foi possível carregar as avaliações."));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadInitial();

    return () => {
      cancelled = true;
    };
  }, [loadReviews]);

  const handleRetry = useCallback(() => {
    setIsLoading(true);
    setError(null);

    loadReviews(INITIAL_REVIEWS_LIMIT, false)
      .catch((err: unknown) => {
        setError(toSectionError(err, "Não foi possível carregar as avaliações."));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [loadReviews]);

  const handleLoadMore = useCallback(() => {
    const nextLimit = limit + REVIEWS_PAGE_SIZE;
    setIsLoadingMore(true);
    setLoadMoreError(null);

    loadReviews(nextLimit, true)
      .then(() => {
        setLimit(nextLimit);
      })
      .catch((err: unknown) => {
        setLoadMoreError(
          toSectionError(err, "Não foi possível carregar mais avaliações."),
        );
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  }, [limit, loadReviews]);

  // Summary stays visible while the list loads so average and total persist
  const showListError = error !== null && reviews.length === 0 && !isLoading;

  return (
    <section aria-label="Avaliações">
      <h2 className="mb-3 text-lg font-semibold text-foreground">Avaliações</h2>
      <div className="space-y-4">
        <ReviewSummary summary={initialSummary} />

        {showListError ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-3 p-5">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ReviewList
            reviews={reviews}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            loadMoreError={loadMoreError}
            onLoadMore={handleLoadMore}
          />
        )}
      </div>
    </section>
  );
}
