"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Hash } from "lucide-react";

import WorkerProposalPaymentSection from "@/components/pages/worker-proposal-payment-section";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  formatProposalDate,
  formatProposalPrice,
  PROPOSAL_STATUS_LABELS,
} from "@/lib/worker/proposal/labels";
import type {
  ProposalStatus,
  WorkerProposal,
} from "@/lib/worker/proposal/types";
import { cn } from "@/lib/utils";

type WorkerProposalDetailPageProps = {
  proposal: WorkerProposal;
};

const STATUS_BADGE_CLASS: Record<ProposalStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  ACCEPTED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-800",
  WITHDRAWN: "border-slate-200 bg-slate-50 text-slate-700",
};

export default function WorkerProposalDetailPage({
  proposal,
}: WorkerProposalDetailPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/worker/proposal"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "mb-6 gap-2 text-muted-foreground",
        )}
      >
        <ArrowLeft className="size-4" />
        Voltar às propostas
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Detalhe da proposta
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informações completas da proposta enviada.
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn("text-sm", STATUS_BADGE_CLASS[proposal.status])}
        >
          {PROPOSAL_STATUS_LABELS[proposal.status]}
        </Badge>
      </div>

      <div className="space-y-6 rounded-xl border border-border bg-card p-6">
        <div>
          <p className="text-sm text-muted-foreground">Valor proposto</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">
            {formatProposalPrice(Number(proposal.price))}
          </p>
        </div>

        <Separator />

        <div>
          <p className="text-sm font-medium text-foreground">Descrição</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {proposal.description}
          </p>
        </div>

        <Separator />

        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Clock className="size-3.5" />
              Duração estimada
            </dt>
            <dd className="text-sm text-foreground">
              {proposal.estimated_duration ?? "Não informada"}
            </dd>
          </div>

          <div className="space-y-1">
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Hash className="size-3.5" />
              Pedido vinculado
            </dt>
            <dd className="break-all font-mono text-sm text-foreground">
              {proposal.service_order_id}
            </dd>
          </div>

          <div className="space-y-1">
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Calendar className="size-3.5" />
              Enviada em
            </dt>
            <dd className="text-sm text-foreground">
              {formatProposalDate(proposal.created_at)}
            </dd>
          </div>

          <div className="space-y-1">
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Calendar className="size-3.5" />
              Atualizada em
            </dt>
            <dd className="text-sm text-foreground">
              {formatProposalDate(proposal.updated_at)}
            </dd>
          </div>
        </dl>

        {proposal.status === "ACCEPTED" ? (
          <>
            <Separator />
            <WorkerProposalPaymentSection proposalId={proposal.id} />
          </>
        ) : null}
      </div>
    </div>
  );
}
