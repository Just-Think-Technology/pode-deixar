// Contract actions — role- and status-aware actions for the tracking screen

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  formatTrackingDateTime,
  getReviewRatingLabel,
} from "@/lib/tracking/labels";
import { MAX_REVIEW_COMMENT_LENGTH } from "@/lib/tracking/validation";
import type { ContractTracking } from "@/lib/tracking/types";
import { ReviewStars } from "@/components/shared/tracking/review-stars";
import { cn } from "@/lib/utils";

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
  const [confirmOpen, setConfirmOpen] = useState(false);

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
    setConfirmOpen(false);
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
            <CardTitle className="text-base">
              Avalie {tracking.counterpart.completeName}
            </CardTitle>
            <CardDescription>
              Serviço concluído
              {tracking.evidence
                ? ` em ${formatTrackingDateTime(tracking.evidence.completedAt)}`
                : ""}
              . Conte como foi sua experiência com o prestador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReviewStars
              rating={rating}
              disabled={isReviewing}
              onChange={setRating}
            />
            <Textarea
              value={comment}
              maxLength={MAX_REVIEW_COMMENT_LENGTH}
              rows={3}
              disabled={isReviewing}
              placeholder="Conte como foi sua experiência com o prestador."
              aria-label="Comentário da avaliação"
              onChange={(event) => setComment(event.target.value)}
            />
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {comment.length}/{MAX_REVIEW_COMMENT_LENGTH} caracteres
            </p>
            <Button
              onClick={() => {
                if (rating < 1) {
                  toast.error("Escolha uma nota de 1 a 5 para avaliar.");
                  return;
                }
                setConfirmOpen(true);
              }}
              disabled={isReviewing || rating < 1}
            >
              Enviar avaliação
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {tracking.review ? (
        <Card id="avaliacao" className="scroll-mt-4">
          <CardHeader>
            <CardTitle className="text-base">Avaliação realizada</CardTitle>
            <CardDescription>
              Enviada em {formatTrackingDateTime(tracking.review.createdAt)}{" "}
              para {tracking.counterpart.completeName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p
              className="text-lg text-[#F2C94C]"
              aria-label={`Nota ${tracking.review.rating} de 5 — ${getReviewRatingLabel(tracking.review.rating)}`}
            >
              {"★".repeat(tracking.review.rating)}
              <span className="text-muted-foreground/40">
                {"★".repeat(5 - tracking.review.rating)}
              </span>
              <span className="ml-2 align-middle text-sm text-muted-foreground">
                {getReviewRatingLabel(tracking.review.rating)}
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

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (!isReviewing) {
            setConfirmOpen(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar avaliação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja enviar esta avaliação? Confira a nota e o comentário
              antes de confirmar. Após o envio, talvez não seja possível
              alterar a avaliação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Nota</dt>
              <dd className="font-medium text-foreground">
                {rating} de 5 — {getReviewRatingLabel(rating)}
              </dd>
            </div>
            {comment.trim() ? (
              <div>
                <dt className="text-muted-foreground">Comentário</dt>
                <dd className="font-medium text-foreground">{comment.trim()}</dd>
              </div>
            ) : null}
          </dl>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReviewing}>
              Voltar e editar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isReviewing}
              onClick={() => void handleReview()}
            >
              {isReviewing ? (
                <>
                  <Spinner className="size-4" />
                  Enviando...
                </>
              ) : (
                "Confirmar avaliação"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
