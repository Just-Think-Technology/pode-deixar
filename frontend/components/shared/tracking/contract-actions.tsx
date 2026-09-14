// Contract actions — role- and status-aware actions for the tracking screen

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { getApiErrorMessage } from "@/lib/auth/errors";
import {
  startServiceAction,
  submitReviewAction,
} from "@/lib/tracking/actions";
import { getAvailableActions } from "@/lib/tracking/timeline-builder";
import { MAX_REVIEW_COMMENT_LENGTH } from "@/lib/tracking/validation";
import type { ContractTracking } from "@/lib/tracking/types";
import { cn } from "@/lib/utils";

const STAR_VALUES = [1, 2, 3, 4, 5];

type ContractActionsProps = {
  tracking: ContractTracking;
};

export function ContractActions({ tracking }: ContractActionsProps) {
  const router = useRouter();
  const actions = getAvailableActions(tracking);
  const [isStarting, setIsStarting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  async function handleStart() {
    setIsStarting(true);
    try {
      await startServiceAction(tracking.orderId);
      toast.success("Serviço iniciado com sucesso!");
      router.refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsStarting(false);
    }
  }

  async function handleReview() {
    if (rating < 1) {
      toast.error("Escolha uma nota de 1 a 5 para avaliar.");
      return;
    }
    setIsReviewing(true);
    try {
      await submitReviewAction(tracking.orderId, {
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      });
      toast.success("Avaliação enviada com sucesso!");
      router.refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setIsReviewing(false);
    }
  }

  return (
    <div className="space-y-4">
      {actions.canPay ? (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTitle className="text-amber-900">
            Pagamento pendente
          </AlertTitle>
          <AlertDescription className="text-amber-800">
            Conclua o pagamento para confirmar o agendamento. O serviço só
            pode começar após a confirmação.
          </AlertDescription>
          <Link
            href={`/client/orders/${tracking.orderId}/checkout`}
            className={cn(buttonVariants(), "mt-3")}
          >
            Ver pagamento
          </Link>
        </Alert>
      ) : null}

      {actions.canStart ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Serviço agendado</CardTitle>
            <CardDescription>
              Quando chegar ao local, inicie o serviço para atualizar o
              acompanhamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void handleStart()} disabled={isStarting}>
              {isStarting ? (
                <>
                  <Spinner className="size-4" />
                  Iniciando...
                </>
              ) : (
                "Iniciar serviço"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {actions.canFinish ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Serviço em andamento</CardTitle>
            <CardDescription>
              Adicione fotos e observações na finalização. É necessária pelo
              menos uma foto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/worker/orders/${tracking.orderId}/complete`}
              className={cn(buttonVariants())}
            >
              Finalizar serviço
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {actions.canReview ? (
        <Card id="avaliacao" className="scroll-mt-4">
          <CardHeader>
            <CardTitle className="text-base">Avalie o prestador</CardTitle>
            <CardDescription>
              Conte como foi o serviço. Sua avaliação constrói a reputação do
              profissional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className="flex gap-1"
              role="radiogroup"
              aria-label="Nota da avaliação"
            >
              {STAR_VALUES.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} de 5`}
                  disabled={isReviewing}
                  onClick={() => setRating(value)}
                  className={cn(
                    "rounded-md px-2 py-1 text-2xl transition",
                    value <= rating ? "text-[#F2C94C]" : "text-muted-foreground/40",
                    "hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  ★
                </button>
              ))}
            </div>
            <Textarea
              value={comment}
              maxLength={MAX_REVIEW_COMMENT_LENGTH}
              rows={3}
              disabled={isReviewing}
              placeholder="Comentário opcional sobre o serviço."
              aria-label="Comentário da avaliação"
              onChange={(event) => setComment(event.target.value)}
            />
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {comment.length}/{MAX_REVIEW_COMMENT_LENGTH} caracteres
            </p>
            <Button
              onClick={() => void handleReview()}
              disabled={isReviewing || rating < 1}
            >
              {isReviewing ? (
                <>
                  <Spinner className="size-4" />
                  Enviando...
                </>
              ) : (
                "Enviar avaliação"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {tracking.review ? (
        <Card id="avaliacao" className="scroll-mt-4">
          <CardHeader>
            <CardTitle className="text-base">Avaliação realizada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-lg text-[#F2C94C]" aria-label={`Nota ${tracking.review.rating} de 5`}>
              {"★".repeat(tracking.review.rating)}
              <span className="text-muted-foreground/40">
                {"★".repeat(5 - tracking.review.rating)}
              </span>
            </p>
            {tracking.review.comment ? (
              <p className="text-foreground">{tracking.review.comment}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        Mensagens e suporte estarão disponíveis em breve.
      </p>
    </div>
  );
}
