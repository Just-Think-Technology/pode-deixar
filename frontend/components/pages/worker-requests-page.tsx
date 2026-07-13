"use client";

import Link from "next/link";
import { Calendar, Inbox, Tag, Wallet } from "lucide-react";

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
  formatRequestBudget,
  formatRequestDate,
  getRequestStatusLabel,
} from "@/lib/worker/requests/labels";
import type { WorkerRequest } from "@/lib/worker/requests/types";
import { cn } from "@/lib/utils";

type WorkerRequestsPageProps = {
  requests: WorkerRequest[];
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  OPEN: "border-sky-200 bg-sky-50 text-sky-800",
  IN_PROGRESS: "border-amber-200 bg-amber-50 text-amber-800",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-700",
};

export default function WorkerRequestsPage({
  requests,
}: WorkerRequestsPageProps) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Solicitações recebidas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Veja os pedidos direcionados a você e envie propostas.
        </p>
      </div>

      {requests.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyTitle>Nenhuma solicitação ainda</EmptyTitle>
            <EmptyDescription>
              Quando um cliente solicitar orçamento para você, o pedido
              aparecerá aqui.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {requests.map((request) => (
            <li key={request.id}>
              <Card className="flex h-full flex-col">
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
                  <div className="min-w-0 space-y-1">
                    <p className="line-clamp-2 text-lg font-semibold text-foreground">
                      {request.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      Pedido {request.id.slice(0, 8)}…
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      STATUS_BADGE_CLASS[request.status] ??
                        "border-slate-200 bg-slate-50 text-slate-700",
                    )}
                  >
                    {getRequestStatusLabel(request.status)}
                  </Badge>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {request.description}
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Tag className="size-3.5" />
                      {request.category.name}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Wallet className="size-3.5" />
                      {formatRequestBudget(
                        request.budget_min,
                        request.budget_max,
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      {formatRequestDate(request.created_at)}
                    </span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link
                    href={`/worker/requests/${request.id}`}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full",
                    )}
                  >
                    Ver e responder
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
