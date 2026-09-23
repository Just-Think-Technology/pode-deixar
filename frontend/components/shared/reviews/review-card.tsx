// Review card — individual provider review with optional comment

import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import type { ProviderReview } from "@/lib/client/reviews/types";
import { formatReviewDate } from "@/lib/client/reviews/mappers";
import type { ReviewResponse } from "@/lib/worker/reviews/types";
import StarDisplay from "./star-display";

type ReviewCardProps = {
  review: ProviderReview;
  response?: ReviewResponse | null;
  actions?: ReactNode;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

export default function ReviewCard({
  review,
  response = null,
  actions = null,
}: ReviewCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarImage
              src={review.reviewer.avatarUrl ?? undefined}
              alt={review.reviewer.displayName}
            />
            <AvatarFallback>
              {getInitials(review.reviewer.displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span
              data-testid="review-reviewer-name"
              className="truncate text-sm font-semibold text-foreground"
            >
              {review.reviewer.displayName}
            </span>
            <StarDisplay value={review.rating} />
          </div>
          <time
            dateTime={review.createdAt}
            className="shrink-0 text-xs text-muted-foreground"
          >
            {formatReviewDate(review.createdAt)}
          </time>
        </div>

        {review.comment && (
          <p
            data-testid="review-comment"
            className="text-sm leading-relaxed text-muted-foreground"
          >
            {review.comment}
          </p>
        )}

        {response && (
          <div
            data-testid="review-response"
            className="rounded-md bg-muted/50 p-3"
          >
            <p className="mb-1 text-xs font-semibold text-foreground">
              Resposta do prestador · {formatReviewDate(response.createdAt)}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {response.message}
            </p>
          </div>
        )}

        {actions && <div className="flex flex-col gap-2">{actions}</div>}
      </CardContent>
    </Card>
  );
}
