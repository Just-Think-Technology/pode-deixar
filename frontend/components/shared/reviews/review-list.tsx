// Review list — paginated reviews with load more control

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProviderReview } from "@/lib/client/reviews/types";
import ReviewCard from "./review-card";

type ReviewListProps = {
  reviews: ProviderReview[];
  hasMore?: boolean;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  loadMoreError?: string | null;
  onLoadMore?: () => void;
};

export default function ReviewList({
  reviews,
  hasMore = false,
  isLoading = false,
  isLoadingMore = false,
  loadMoreError = null,
  onLoadMore,
}: ReviewListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="review-list-skeleton">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}

      {loadMoreError && (
        <p className="text-center text-sm text-muted-foreground">
          {loadMoreError}
        </p>
      )}

      {hasMore && onLoadMore && (
        <Button
          variant="outline"
          className="w-full"
          onClick={onLoadMore}
          disabled={isLoadingMore}
        >
          {isLoadingMore ? "Carregando…" : "Carregar mais"}
        </Button>
      )}

      {!hasMore && reviews.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Você viu todas as avaliações.
        </p>
      )}
    </div>
  );
}
