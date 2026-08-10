"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Clock3,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getApiErrorMessage } from "@/lib/auth/errors";
import { getPaymentStatusAction } from "@/lib/client/payments/actions";
import {
  formatPaymentAmount,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from "@/lib/client/payments/labels";
import type { PaymentStatusResponse } from "@/lib/client/payments/types";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 24;

type ClientCheckoutConfirmationPageProps = {
  orderId: string;
  paymentId: string;
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FAILED: "border-rose-200 bg-rose-50 text-rose-800",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-700",
  REFUNDED: "border-slate-200 bg-slate-50 text-slate-700",
};

export default function ClientCheckoutConfirmationPage({
  orderId,
  paymentId,
}: ClientCheckoutConfirmationPageProps) {
  const router = useRouter();
  const [status, setStatus] = useState<PaymentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const result = await getPaymentStatusAction(paymentId);
        if (cancelled) return;
        setStatus(result);
        setError(null);
        setLoading(false);

        if (result.status === "PENDING" && polls < MAX_POLLS) {
          polls += 1;
          timer = setTimeout(load, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setError(getApiErrorMessage(err));
        setLoading(false);
        toast.error(getApiErrorMessage(err));
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [paymentId]);

  const refreshOnce = async () => {
    setLoading(true);
    try {
      const result = await getPaymentStatusAction(paymentId);
      setStatus(result);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = status?.status;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href={`/client/orders/${orderId}/checkout`}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "mb-6 gap-2 text-muted-foreground",
        )}
      >
        <ArrowLeft className="size-4" />
        Voltar ao checkout
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Confirmação de pagamento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acompanhe o status da sua transação.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-lg">Status da transação</CardTitle>
            <CardDescription>
              Atualizamos automaticamente enquanto o pagamento estiver pendente.
            </CardDescription>
          </div>
          {currentStatus ? (
            <Badge
              variant="outline"
              className={cn(
                STATUS_BADGE_CLASS[currentStatus] ??
                  "border-slate-200 bg-slate-50 text-slate-700",
              )}
            >
              {getPaymentStatusLabel(currentStatus)}
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-6">
          {loading && !status ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Spinner className="size-8" />
              <p className="text-sm text-muted-foreground">
                Consultando status do pagamento…
              </p>
            </div>
          ) : null}

          {error && !status ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CircleAlert className="size-10 text-destructive" />
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
              <Button type="button" variant="outline" onClick={refreshOnce}>
                Tentar novamente
              </Button>
            </div>
          ) : null}

          {status && currentStatus === "PAID" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="size-12 text-secondary" />
              <div>
                <p className="text-lg font-semibold text-foreground">
                  Pagamento confirmado
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recebemos{" "}
                  {formatPaymentAmount(status.amount)} via{" "}
                  {getPaymentMethodLabel(status.method)}.
                </p>
              </div>
              <Link
                href={`/client/orders/${orderId}`}
                className={cn(buttonVariants(), "mt-2")}
              >
                Ver pedido
              </Link>
            </div>
          ) : null}

          {status && currentStatus === "PENDING" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Clock3 className="size-12 text-amber-500" />
              <div>
                <p className="text-lg font-semibold text-foreground">
                  Pagamento em análise
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Assim que a confirmação chegar, esta página será atualizada.
                  Valor: {formatPaymentAmount(status.amount)}.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={refreshOnce}
                  disabled={loading}
                >
                  <RefreshCw className="size-4" />
                  Atualizar agora
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    router.push(`/client/orders/${orderId}/checkout`)
                  }
                >
                  Voltar ao checkout
                </Button>
              </div>
            </div>
          ) : null}

          {status &&
          (currentStatus === "FAILED" || currentStatus === "CANCELLED") ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CircleAlert className="size-12 text-destructive" />
              <div>
                <p className="text-lg font-semibold text-foreground">
                  Não foi possível concluir o pagamento
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Você pode tentar novamente gerando uma nova cobrança.
                </p>
              </div>
              <Link
                href={`/client/orders/${orderId}/checkout`}
                className={cn(buttonVariants())}
              >
                Tentar pagar de novo
              </Link>
            </div>
          ) : null}

          {status && currentStatus === "REFUNDED" ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CircleAlert className="size-12 text-muted-foreground" />
              <p className="text-lg font-semibold text-foreground">
                Pagamento estornado
              </p>
              <Link
                href={`/client/orders/${orderId}`}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Ver pedido
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
