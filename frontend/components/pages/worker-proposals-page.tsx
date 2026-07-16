"use client";

import Link from "next/link";
import { Clock, FileText, Inbox } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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

type WorkerProposalsPageProps = {
  proposals: WorkerProposal[];
};

const STATUS_BADGE_CLASS: Record<ProposalStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  ACCEPTED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-800",
  WITHDRAWN: "border-slate-200 bg-slate-50 text-slate-700",
};

export default function WorkerProposalsPage({
  proposals,
}: WorkerProposalsPageProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Minhas propostas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe as propostas que você enviou aos clientes.
        </p>
      </div>

      {proposals.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyTitle>Nenhuma proposta ainda</EmptyTitle>
            <EmptyDescription>
              Quando você enviar propostas para pedidos de serviço, elas
              aparecerão aqui.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {proposals.map((proposal) => (
            <li key={proposal.id}>
              <Card className="flex h-full flex-col">
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-lg font-semibold text-foreground">
                      {formatProposalPrice(Number(proposal.price))}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Pedido {proposal.service_order_id.slice(0, 8)}…
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(STATUS_BADGE_CLASS[proposal.status])}
                  >
                    {PROPOSAL_STATUS_LABELS[proposal.status]}
                  </Badge>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {proposal.description}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {proposal.estimated_duration && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {proposal.estimated_duration}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <FileText className="size-3.5" />
                      {formatProposalDate(proposal.created_at)}
                    </span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link
                    href={`/worker/proposal/${proposal.id}`}
                    className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                  >
                    Ver detalhes
                  </Link>
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
