"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Inbox,
  Tag,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { getApiErrorMessage } from "@/lib/auth/errors";
import {
  acceptProposalAction,
  rejectProposalAction,
} from "@/lib/client/orders/actions";
import {
  formatOrderBudget,
  formatOrderDate,
  formatProposalPrice,
  getOrderStatusLabel,
  getProposalStatusLabel,
  isPendingProposal,
} from "@/lib/client/orders/labels";
import type {
  ClientOrder,
  ClientOrderProposal,
} from "@/lib/client/orders/types";
import { cn } from "@/lib/utils";

type ClientOrderDetailPageProps = {
  order: ClientOrder;
};

const ORDER_STATUS_BADGE_CLASS: Record<string, string> = {
  OPEN: "border-sky-200 bg-sky-50 text-sky-800",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-800",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-700",
};

const PROPOSAL_STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING: "border-sky-200 bg-sky-50 text-sky-800",
  ACCEPTED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-800",
  WITHDRAWN: "border-slate-200 bg-slate-50 text-slate-700",
};

type PendingAction = {
  proposalId: string;
  kind: "accept" | "reject";
};

type ConfirmDialog = {
  proposalId: string;
  kind: "accept" | "reject";
} | null;

function applyProposalDecision(
  current: ClientOrder,
  proposalId: string,
  kind: "accept" | "reject",
): ClientOrder {
  return {
    ...current,
    status: kind === "accept" ? "IN_PROGRESS" : current.status,
    proposals: (current.proposals ?? []).map((proposal) => {
      if (proposal.id === proposalId) {
        return {
          ...proposal,
          status: kind === "accept" ? "ACCEPTED" : "REJECTED",
        };
      }
      if (kind === "accept" && proposal.status === "PENDING") {
        return { ...proposal, status: "REJECTED" };
      }
      return proposal;
    }),
  };
}

export default function ClientOrderDetailPage({
  order,
}: ClientOrderDetailPageProps) {
  const router = useRouter();
  const [currentOrder, setCurrentOrder] = useState(order);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>(null);
  const proposals = currentOrder.proposals ?? [];

  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  const runAction = async (
    proposal: ClientOrderProposal,
    kind: "accept" | "reject",
  ) => {
    setConfirmDialog(null);
    setPendingAction({ proposalId: proposal.id, kind });

    try {
      if (kind === "accept") {
        await acceptProposalAction(proposal.id, currentOrder.id);
        toast.success("Proposta aceita com sucesso!");
      } else {
        await rejectProposalAction(proposal.id, currentOrder.id);
        toast.success("Proposta recusada.");
      }
      setCurrentOrder((prev) =>
        applyProposalDecision(prev, proposal.id, kind),
      );
      router.refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/client/orders"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "mb-6 gap-2 text-muted-foreground",
        )}
      >
        <ArrowLeft className="size-4" />
        Voltar às solicitações
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {currentOrder.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Veja as propostas recebidas e escolha a que preferir.
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-sm",
            ORDER_STATUS_BADGE_CLASS[currentOrder.status] ??
              "border-slate-200 bg-slate-50 text-slate-700",
          )}
        >
          {getOrderStatusLabel(currentOrder.status)}
        </Badge>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sobre o pedido</CardTitle>
            <CardDescription>
              Detalhes da sua solicitação de orçamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed text-foreground">
              {currentOrder.description}
            </p>
            <Separator />
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <Tag className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-muted-foreground">Categoria</dt>
                  <dd className="font-medium text-foreground">
                    {currentOrder.category.name}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Wallet className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-muted-foreground">Orçamento</dt>
                  <dd className="font-medium text-foreground">
                    {formatOrderBudget(
                      currentOrder.budget_min,
                      currentOrder.budget_max,
                    )}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-muted-foreground">Criada em</dt>
                  <dd className="font-medium text-foreground">
                    {formatOrderDate(currentOrder.created_at)}
                  </dd>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Propostas recebidas
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aceite uma proposta para contratar o serviço ou recuse as que não
              atenderem.
            </p>
          </div>

          {proposals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <Inbox className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  Nenhuma proposta ainda
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Assim que um prestador enviar uma proposta, ela aparecerá
                  aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-4">
              {proposals.map((proposal) => {
                const pending = isPendingProposal(proposal.status);
                const isBusy =
                  pendingAction?.proposalId === proposal.id;
                const accepting =
                  isBusy && pendingAction?.kind === "accept";
                const rejecting =
                  isBusy && pendingAction?.kind === "reject";

                return (
                  <li key={proposal.id}>
                    <Card>
                      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            {formatProposalPrice(proposal.price)}
                          </CardTitle>
                          <CardDescription>
                            Recebida em {formatOrderDate(proposal.created_at)}
                          </CardDescription>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            PROPOSAL_STATUS_BADGE_CLASS[proposal.status] ??
                              "border-slate-200 bg-slate-50 text-slate-700",
                          )}
                        >
                          {getProposalStatusLabel(proposal.status)}
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm leading-relaxed text-foreground">
                          {proposal.description}
                        </p>
                        {proposal.estimated_duration ? (
                          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="size-4" />
                            Duração estimada: {proposal.estimated_duration}
                          </p>
                        ) : null}

                        {pending ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              className="gap-2"
                              disabled={!!pendingAction}
                              onClick={() =>
                                setConfirmDialog({
                                  proposalId: proposal.id,
                                  kind: "accept",
                                })
                              }
                            >
                              {accepting ? (
                                <Spinner />
                              ) : (
                                <Check className="size-4" />
                              )}
                              {accepting ? "Aceitando..." : "Aceitar"}
                            </Button>

                            <Button
                              variant="outline"
                              className="gap-2"
                              disabled={!!pendingAction}
                              onClick={() =>
                                setConfirmDialog({
                                  proposalId: proposal.id,
                                  kind: "reject",
                                })
                              }
                            >
                              {rejecting ? (
                                <Spinner />
                              ) : (
                                <X className="size-4" />
                              )}
                              {rejecting ? "Recusando..." : "Recusar"}
                            </Button>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <AlertDialog
        open={confirmDialog != null}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.kind === "reject"
                ? "Recusar esta proposta?"
                : "Aceitar esta proposta?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.kind === "reject"
                ? "A proposta será marcada como recusada. Você poderá aceitar outras propostas deste pedido."
                : "Ao aceitar, o pedido entra em andamento e as demais propostas pendentes serão recusadas."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant={
                confirmDialog?.kind === "reject" ? "destructive" : "default"
              }
              disabled={!confirmDialog || !!pendingAction}
              onClick={() => {
                if (!confirmDialog) return;
                const proposal = proposals.find(
                  (item) => item.id === confirmDialog.proposalId,
                );
                if (!proposal) return;
                void runAction(proposal, confirmDialog.kind);
              }}
            >
              {confirmDialog?.kind === "reject"
                ? "Confirmar recusa"
                : "Confirmar aceite"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
