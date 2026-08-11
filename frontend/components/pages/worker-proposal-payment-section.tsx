"use client";

import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/spinner";
import { getApiErrorMessage } from "@/lib/auth/errors";
import { getWorkerPaymentStatusByProposalAction } from "@/lib/worker/payments/actions";
import {
  formatWorkerPaymentAmount,
  getWorkerPaymentMethodLabel,
  getWorkerPaymentStatusLabel,
} from "@/lib/worker/payments/labels";
import type { WorkerPaymentStatusResponse } from "@/lib/worker/payments/types";
import { cn } from "@/lib/utils";

type WorkerProposalPaymentSectionProps = {
  proposalId: string;
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FAILED: "border-rose-200 bg-rose-50 text-rose-800",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-700",
  REFUNDED: "border-slate-200 bg-slate-50 text-slate-700",
};

export default function WorkerProposalPaymentSection({
  proposalId,
}: WorkerProposalPaymentSectionProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<WorkerPaymentStatusResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const result = await getWorkerPaymentStatusByProposalAction(proposalId);
      setStatus(result);
      setError(null);
      setLoadedOnce(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setStatus(null);
      setLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || loadedOnce) return;

    let cancelled = false;

    const loadOnce = async () => {
      setLoading(true);
      try {
        const result =
          await getWorkerPaymentStatusByProposalAction(proposalId);
        if (cancelled) return;
        setStatus(result);
        setError(null);
        setLoadedOnce(true);
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err));
        setStatus(null);
        setLoadedOnce(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadOnce();

    return () => {
      cancelled = true;
    };
  }, [open, loadedOnce, proposalId]);

  const currentStatus = status?.status;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted/70",
        )}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Wallet className="size-4 text-primary" />
          Status do pagamento
        </span>
        <span className="flex items-center gap-2">
          {currentStatus ? (
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                STATUS_BADGE_CLASS[currentStatus] ??
                  "border-slate-200 bg-slate-50 text-slate-700",
              )}
            >
              {getWorkerPaymentStatusLabel(currentStatus)}
            </Badge>
          ) : null}
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-3">
        <div className="rounded-lg border border-border bg-card px-4 py-4">
          {loading && !status && !error ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Spinner className="size-5" />
              Consultando status do pagamento…
            </div>
          ) : null}

          {error && !status ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CircleAlert className="size-8 text-destructive" />
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refresh}
              >
                Tentar novamente
              </Button>
            </div>
          ) : null}

          {status && currentStatus === "PAID" ? (
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <CheckCircle2 className="size-10 text-secondary" />
              <p className="text-base font-semibold text-foreground">
                Pagamento confirmado
              </p>
              <p className="text-sm text-muted-foreground">
                O cliente pagou {formatWorkerPaymentAmount(status.amount)} via{" "}
                {getWorkerPaymentMethodLabel(status.method)}. Você pode
                executar o serviço.
              </p>
            </div>
          ) : null}

          {status && currentStatus === "PENDING" ? (
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <Clock3 className="size-10 text-amber-500" />
              <p className="text-base font-semibold text-foreground">
                Aguardando pagamento do cliente
              </p>
              <p className="text-sm text-muted-foreground">
                Valor: {formatWorkerPaymentAmount(status.amount)}.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 gap-2"
                onClick={refresh}
                disabled={loading}
              >
                <RefreshCw className="size-4" />
                Atualizar
              </Button>
            </div>
          ) : null}

          {status &&
          (currentStatus === "FAILED" || currentStatus === "CANCELLED") ? (
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <CircleAlert className="size-10 text-destructive" />
              <p className="text-base font-semibold text-foreground">
                Pagamento não concluído
              </p>
              <p className="text-sm text-muted-foreground">
                O cliente ainda não finalizou o pagamento.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={loading}
              >
                Atualizar
              </Button>
            </div>
          ) : null}

          {status && currentStatus === "REFUNDED" ? (
            <div className="flex flex-col items-center gap-2 py-2 text-center">
              <CircleAlert className="size-10 text-muted-foreground" />
              <p className="text-base font-semibold text-foreground">
                Pagamento estornado
              </p>
            </div>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
