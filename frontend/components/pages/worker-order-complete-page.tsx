"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CompletionConfirmDialog } from "@/components/pages/worker-order-complete/completion-confirm-dialog";
import { CompletionError } from "@/components/pages/worker-order-complete/completion-error";
import { CompletionHistoryView } from "@/components/pages/worker-order-complete/completion-history";
import { CompletionPhotoUploader } from "@/components/pages/worker-order-complete/completion-photo-uploader";
import { CompletionSuccess } from "@/components/pages/worker-order-complete/completion-success";
import { CompletionSummary } from "@/components/pages/worker-order-complete/completion-summary";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { completeOrderAction } from "@/lib/worker/orders/actions";
import { getCompletionOrderErrorMessage } from "@/lib/worker/orders/labels";
import type {
  CompletionHistory,
  CompletionOrder,
  CompletionPhoto,
} from "@/lib/worker/orders/types";
import {
  MAX_OBSERVATIONS_LENGTH,
  validateCompleteOrder,
} from "@/lib/worker/orders/validation";
import { cn } from "@/lib/utils";

type WorkerOrderCompletePageProps = {
  order: CompletionOrder;
  history: CompletionHistory | null;
};

export default function WorkerOrderCompletePage({
  order,
  history,
}: WorkerOrderCompletePageProps) {
  const [photos, setPhotos] = useState<CompletionPhoto[]>([]);
  const [observations, setObservations] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [completedHistory, setCompletedHistory] =
    useState<CompletionHistory | null>(null);
  const [showingHistory, setShowingHistory] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  // A conclusão registrada nesta sessão tem precedência: após o
  // `revalidatePath` da action, o servidor já retorna o pedido como
  // COMPLETED, mas o prestador deve ver primeiro a tela de sucesso (Estado 6).
  if (completedHistory && !showingHistory) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <BackToAgendaLink />
        <CompletionSuccess onViewService={() => setShowingHistory(true)} />
      </div>
    );
  }

  if (completedHistory && showingHistory) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <BackToAgendaLink />
        <CompletionHistoryView order={order} history={completedHistory} />
      </div>
    );
  }

  if (order.order_status === "COMPLETED") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <BackToAgendaLink />
        <CompletionHistoryView order={order} history={history} />
      </div>
    );
  }

  function handleConcludeClick() {
    const validation = validateCompleteOrder(photos.length, observations);
    if (!validation.ok) {
      setFormError(
        Object.values(validation.errors)[0] ??
          "Verifique as informações antes de continuar.",
      );
      return;
    }
    setFormError(null);
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    setIsProcessing(true);
    setCompletionError(null);
    try {
      const result = await completeOrderAction(
        order.order_id,
        photos.length,
        observations,
      );
      setConfirmOpen(false);
      setCompletedHistory(result);
    } catch (err) {
      setConfirmOpen(false);
      setCompletionError(getCompletionOrderErrorMessage(err));
    } finally {
      setIsProcessing(false);
      setIsRetrying(false);
    }
  }

  function handleRetry() {
    setIsRetrying(true);
    setCompletionError(null);
    void handleConfirm();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <BackToAgendaLink />
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Finalizar serviço
      </h1>

      <CompletionSummary order={order} />

      <CompletionPhotoUploader
        orderId={order.order_id}
        photos={photos}
        disabled={isProcessing}
        onPhotosChange={(next) => {
          setPhotos(next);
          if (next.length > 0) {
            setFormError(null);
          }
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Observações sobre o serviço</CardTitle>
          <CardDescription>Opcional</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={observations}
            maxLength={MAX_OBSERVATIONS_LENGTH}
            rows={4}
            disabled={isProcessing}
            placeholder="Informe alguma observação importante sobre a execução do serviço."
            aria-label="Observações sobre o serviço"
            onChange={(e) => setObservations(e.target.value)}
          />
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {observations.length}/{MAX_OBSERVATIONS_LENGTH} caracteres
          </p>
        </CardContent>
      </Card>

      {formError ? (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}

      {completionError ? (
        <CompletionError
          message={completionError}
          isRetrying={isRetrying}
          onRetry={handleRetry}
        />
      ) : null}

      <Button
        type="button"
        size="lg"
        disabled={photos.length === 0 || isProcessing}
        onClick={handleConcludeClick}
      >
        {isProcessing ? (
          <>
            <Spinner className="size-4" />
            Concluindo...
          </>
        ) : (
          "Concluir serviço"
        )}
      </Button>

      <CompletionConfirmDialog
        open={confirmOpen}
        photoCount={photos.length}
        isProcessing={isProcessing}
        onOpenChange={(open) => {
          if (!isProcessing) {
            setConfirmOpen(open);
          }
        }}
        onConfirm={() => void handleConfirm()}
      />
    </div>
  );
}

function BackToAgendaLink() {
  return (
    <Link
      href="/worker/agenda"
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-fit")}
    >
      <ArrowLeft />
      Voltar para agenda
    </Link>
  );
}
