// Review summary — average, total count and rating distribution

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReviewsSummary } from "@/lib/client/reviews/types";
import { formatAverage } from "@/lib/client/reviews/mappers";
import StarDisplay from "./star-display";

type ReviewSummaryProps = {
  summary: ReviewsSummary;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

const DISTRIBUTION_ROWS = [5, 4, 3, 2, 1] as const;

export default function ReviewSummary({
  summary,
  isLoading = false,
  error = null,
  onRetry,
}: ReviewSummaryProps) {
  if (isLoading) {
    return (
      <Card data-testid="review-summary-skeleton">
        <CardContent className="flex gap-4 p-5">
          <Skeleton className="h-12 w-16" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-5">
          <p className="text-sm text-muted-foreground">{error}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Tentar novamente
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (summary.average === null || summary.total === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">
            Este prestador ainda não recebeu avaliações.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex items-center gap-3">
          <span className="text-4xl font-bold text-foreground">
            {formatAverage(summary.average)}
          </span>
          <span className="flex flex-col gap-1">
            <StarDisplay value={summary.average} />
            <span className="text-sm text-muted-foreground">
              Baseado em {summary.total}{" "}
              {summary.total === 1 ? "avaliação" : "avaliações"}
            </span>
          </span>
        </div>

        <div className="flex-1 space-y-1.5" role="list" aria-label="Distribuição das notas">
          {DISTRIBUTION_ROWS.map((stars) => {
            const count = summary.distribution[stars];
            const share = summary.total > 0 ? count / summary.total : 0;

            return (
              <div key={stars} role="listitem" className="flex items-center gap-2 text-sm">
                <span className="w-16 shrink-0 text-muted-foreground">
                  {stars} {stars === 1 ? "estrela" : "estrelas"}
                </span>
                <span
                  aria-hidden
                  className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                >
                  <span
                    className="block h-full rounded-full bg-amber-400"
                    style={{ width: `${share * 100}%` }}
                  />
                </span>
                <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
