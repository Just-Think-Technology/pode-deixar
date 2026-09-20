// Client checkout page — payment method, scheduling, and charge display

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarIcon,
  CheckCircle2,
  Copy,
  CreditCard,
  QrCode,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { getApiErrorMessage } from "@/lib/auth/errors";
import type { ClientOrder } from "@/lib/client/orders/types";
import {
  confirmPaymentMockAction,
  startCheckoutAction,
} from "@/lib/client/payments/actions";
import {
  formatPaymentAmount,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from "@/lib/client/payments/labels";
import {
  buildScheduledAtIso,
  validateServiceSchedule,
} from "@/lib/client/payments/scheduling";
import type {
  ChargeResponse,
  Payment,
  PaymentMethod,
} from "@/lib/client/payments/types";
import {
  isCreditCardCharge,
  isPixCharge,
} from "@/lib/client/payments/types";
import { cn } from "@/lib/utils";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

type ClientCheckoutPageProps = {
  order: ClientOrder;
};

function resolveDisplayAmount(order: ClientOrder): number | null {
  const accepted = order.proposals?.find((p) => p.status === "ACCEPTED");
  return accepted?.price ?? null;
}

function isAllowedCheckoutUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === "mercadopago.com" ||
      host.endsWith(".mercadopago.com") ||
      host === "mercadolivre.com" ||
      host.endsWith(".mercadolivre.com")
    );
  } catch {
    return false;
  }
}

export default function ClientCheckoutPage({ order }: ClientCheckoutPageProps) {
  const router = useRouter();
  const defaultScheduleDate = useMemo(() => addDays(new Date(), 1), []);
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(
    defaultScheduleDate,
  );
  const [scheduleStartTime, setScheduleStartTime] = useState("09:00");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [scheduleErrors, setScheduleErrors] = useState<Record<string, string>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [charge, setCharge] = useState<ChargeResponse | null>(null);

  const displayAmount = payment?.amount ?? resolveDisplayAmount(order);
  const canPay = displayAmount != null && order.status !== "CANCELLED";

  const handleStartCheckout = async () => {
    if (!canPay) {
      toast.error("Não há valor definido para este pedido.");
      return;
    }

    const validationErrors = validateServiceSchedule({
      date: scheduleDate,
      startTime: scheduleStartTime,
      endTime: scheduleEndTime || undefined,
    });

    if (Object.keys(validationErrors).length > 0) {
      setScheduleErrors(validationErrors);
      toast.error("Revise a data e o horário do serviço.");
      return;
    }

    setScheduleErrors({});

    let scheduledAt: string;
    let scheduledEndAt: string | undefined;

    try {
      ({ scheduledAt, scheduledEndAt } = buildScheduledAtIso({
        date: scheduleDate,
        startTime: scheduleStartTime,
        endTime: scheduleEndTime || undefined,
      }));
    } catch {
      toast.error("Data ou horário do serviço inválidos.");
      return;
    }

    setBusy(true);
    try {
      const result = await startCheckoutAction(
        order.id,
        method,
        scheduledAt,
        scheduledEndAt,
      );
      setPayment(result.payment);
      setCharge(result.charge);
      toast.success("Cobrança gerada. Conclua o pagamento abaixo.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCopyPix = async () => {
    if (!charge || !isPixCharge(charge.cobranca)) return;
    try {
      await navigator.clipboard.writeText(charge.cobranca.pixCopiaECola);
      toast.success("Código Pix copiado.");
    } catch {
      toast.error("Não foi possível copiar o código.");
    }
  };

  const handleSimulatePaid = async () => {
    if (!payment) return;
    setConfirming(true);
    try {
      await confirmPaymentMockAction(payment.id, order.id);
      toast.success("Pagamento confirmado!");
      router.push(
        `/client/orders/${order.id}/checkout/confirmation?paymentId=${payment.id}`,
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setConfirming(false);
    }
  };

  const goToConfirmation = () => {
    if (!payment) return;
    router.push(
      `/client/orders/${order.id}/checkout/confirmation?paymentId=${payment.id}`,
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href={`/client/orders/${order.id}`}
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "mb-6 gap-2 text-muted-foreground",
        )}
      >
        <ArrowLeft className="size-4" />
        Voltar ao pedido
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Checkout
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirme os dados e realize o pagamento com segurança.
          </p>
        </div>
        {payment ? (
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-800"
          >
            {getPaymentStatusLabel(payment.status)}
          </Badge>
        ) : null}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo do serviço</CardTitle>
            <CardDescription>
              Valores definidos pelo acordo — não é possível alterá-los aqui.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground">{order.title}</p>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
                {order.description}
              </p>
            </div>
            <Separator />
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-2">
                <Wallet className="mt-0.5 size-4 text-muted-foreground" />
                <div>
                  <dt className="text-muted-foreground">Valor a pagar</dt>
                  <dd className="font-semibold text-foreground">
                    {displayAmount != null
                      ? formatPaymentAmount(displayAmount)
                      : "Indisponível"}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-muted-foreground">Categoria</dt>
                <dd className="font-medium text-foreground">
                  {order.category.name}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {!charge ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Agendamento do serviço</CardTitle>
                <CardDescription>
                  Informe quando o prestador deve realizar o serviço. Essa data
                  aparecerá na agenda após a confirmação do pagamento.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="schedule-date">Data</Label>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            id="schedule-date"
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start gap-2 font-normal",
                              !scheduleDate && "text-muted-foreground",
                            )}
                            aria-invalid={!!scheduleErrors.scheduleDate}
                          />
                        }
                      >
                        <CalendarIcon className="size-4" />
                        {scheduleDate
                          ? format(scheduleDate, "PPP", { locale: ptBR })
                          : "Selecione a data"}
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={scheduleDate}
                          onSelect={(day) => {
                            setScheduleDate(day);
                            setScheduleErrors((prev) => {
                              const next = { ...prev };
                              delete next.scheduleDate;
                              return next;
                            });
                          }}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    {scheduleErrors.scheduleDate ? (
                      <p className="text-sm text-destructive" role="alert">
                        {scheduleErrors.scheduleDate}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="schedule-start-time">
                      Horário de início
                    </Label>
                    <Input
                      id="schedule-start-time"
                      type="time"
                      value={scheduleStartTime}
                      onChange={(event) => {
                        setScheduleStartTime(event.target.value);
                        setScheduleErrors((prev) => {
                          const next = { ...prev };
                          delete next.scheduleStartTime;
                          return next;
                        });
                      }}
                      aria-invalid={!!scheduleErrors.scheduleStartTime}
                    />
                    {scheduleErrors.scheduleStartTime ? (
                      <p className="text-sm text-destructive" role="alert">
                        {scheduleErrors.scheduleStartTime}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="schedule-end-time">
                      Horário de término{" "}
                      <span className="font-normal text-muted-foreground">
                        (opcional)
                      </span>
                    </Label>
                    <Input
                      id="schedule-end-time"
                      type="time"
                      value={scheduleEndTime}
                      onChange={(event) => {
                        setScheduleEndTime(event.target.value);
                        setScheduleErrors((prev) => {
                          const next = { ...prev };
                          delete next.scheduleEndTime;
                          return next;
                        });
                      }}
                      aria-invalid={!!scheduleErrors.scheduleEndTime}
                    />
                    {scheduleErrors.scheduleEndTime ? (
                      <p className="text-sm text-destructive" role="alert">
                        {scheduleErrors.scheduleEndTime}
                      </p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Forma de pagamento</CardTitle>
              <CardDescription>
                Escolha como deseja pagar. Dados de cartão nunca são coletados
                nesta tela.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup
                value={method}
                onValueChange={(value) => {
                  if (value === "PIX" || value === "CREDIT_CARD") {
                    setMethod(value);
                  }
                }}
                className="gap-3"
                disabled={busy || !canPay}
              >
                <Label
                  htmlFor="method-pix"
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/40",
                    method === "PIX" && "border-primary bg-primary/5",
                  )}
                >
                  <RadioGroupItem value="PIX" id="method-pix" />
                  <QrCode className="size-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">
                      {getPaymentMethodLabel("PIX")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pague com QR Code ou copia e cola
                    </p>
                  </div>
                </Label>
                <Label
                  htmlFor="method-card"
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/40",
                    method === "CREDIT_CARD" && "border-primary bg-primary/5",
                  )}
                >
                  <RadioGroupItem value="CREDIT_CARD" id="method-card" />
                  <CreditCard className="size-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">
                      {getPaymentMethodLabel("CREDIT_CARD")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Abre o checkout externo seguro
                    </p>
                  </div>
                </Label>
              </RadioGroup>

              {!canPay ? (
                <p className="text-sm text-destructive" role="alert">
                  Este pedido ainda não tem valor acordado. Aceite uma proposta
                  antes de pagar.
                </p>
              ) : null}

              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={busy || !canPay}
                onClick={handleStartCheckout}
              >
                {busy ? (
                  <>
                    <Spinner className="size-4" />
                    Gerando cobrança…
                  </>
                ) : (
                  "Continuar para pagamento"
                )}
              </Button>
            </CardContent>
          </Card>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {payment
                  ? getPaymentMethodLabel(payment.method)
                  : "Pagamento"}
              </CardTitle>
              <CardDescription>
                Conclua o pagamento e acompanhe a confirmação.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPixCharge(charge.cobranca) ? (
                <div className="space-y-4">
                  {charge.cobranca.qrCodeBase64 ? (
                    <div className="flex justify-center rounded-lg border border-border bg-white p-4">
                      {/* Data-URI QR code: next/image cannot optimize it. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`data:image/png;base64,${charge.cobranca.qrCodeBase64}`}
                        alt="QR Code Pix"
                        className="size-40"
                      />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="pix-code">Pix copia e cola</Label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <code
                        id="pix-code"
                        className="block flex-1 overflow-x-auto rounded-md border border-border bg-muted/40 px-3 py-2 text-xs break-all"
                      >
                        {charge.cobranca.pixCopiaECola}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCopyPix}
                        className="shrink-0 gap-2"
                      >
                        <Copy className="size-4" />
                        Copiar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {isCreditCardCharge(charge.cobranca) ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Você será direcionado a um ambiente seguro para informar os
                    dados do cartão.
                  </p>
                  {isAllowedCheckoutUrl(charge.cobranca.linkCheckout) ? (
                    <a
                      href={charge.cobranca.linkCheckout}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants(), "gap-2")}
                    >
                      <CreditCard className="size-4" />
                      Abrir checkout do cartão
                    </a>
                  ) : (
                    <p className="text-sm text-destructive" role="alert">
                      Link de pagamento inválido. Tente gerar a cobrança
                      novamente.
                    </p>
                  )}
                </div>
              ) : null}

              <Separator />

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {USE_MOCK ? (
                  <Button
                    type="button"
                    onClick={handleSimulatePaid}
                    disabled={confirming}
                    className="gap-2"
                  >
                    {confirming ? (
                      <>
                        <Spinner className="size-4" />
                        Confirmando…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4" />
                        Simular confirmação de pagamento
                      </>
                    )}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToConfirmation}
                >
                  Já paguei — ver confirmação
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
