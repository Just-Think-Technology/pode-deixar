// Tracking states — loading, error, not-found and cancelled placeholders

"use client";

import Link from "next/link";

import EmptyState from "@/components/shared/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTrackingDateTime } from "@/lib/tracking/labels";
import { cn } from "@/lib/utils";

export function TrackingLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8" aria-busy="true">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

type TrackingErrorProps = {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
};

export function TrackingError({ message, onRetry, isRetrying }: TrackingErrorProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Alert variant="destructive">
        <AlertTitle>Erro ao carregar a contratação</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <Button
        type="button"
        variant="outline"
        className="mt-4"
        disabled={isRetrying}
        onClick={onRetry}
      >
        {isRetrying ? "Tentando novamente..." : "Tentar novamente"}
      </Button>
    </div>
  );
}

type TrackingNotFoundProps = {
  backHref: string;
  backLabel: string;
};

export function TrackingNotFound({ backHref, backLabel }: TrackingNotFoundProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <EmptyState
        title="Contratação não encontrada"
        description="Ela pode ter sido removida ou você não tem permissão para acessá-la."
        action={
          <Link href={backHref} className={cn(buttonVariants({ variant: "outline" }))}>
            {backLabel}
          </Link>
        }
      />
    </div>
  );
}

type TrackingCancelledNoticeProps = {
  reason: string | null;
  cancelledAt: string | null;
};

export function TrackingCancelledNotice({
  reason,
  cancelledAt,
}: TrackingCancelledNoticeProps) {
  return (
    <Card className="border-slate-200 bg-slate-50">
      <CardHeader>
        <CardTitle className="text-base">Contratação cancelada</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {reason ? <p className="text-foreground">{reason}</p> : null}
        {cancelledAt ? (
          <p className="text-muted-foreground">
            Cancelada em {formatTrackingDateTime(cancelledAt)}
          </p>
        ) : null}
        <p className="text-muted-foreground">
          O histórico permanece disponível para consulta.
        </p>
      </CardContent>
    </Card>
  );
}
