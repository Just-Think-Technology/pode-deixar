"use client";

import Link from "next/link";
import {
  Calendar,
  CircleAlert,
  RefreshCw,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getApiErrorMessage } from "@/lib/auth/errors";
import { getWorkerFinanceDashboardAction } from "@/lib/worker/finance/actions";
import {
  formatFeeRate,
  formatFinanceAmount,
  formatFinanceDate,
  getFinancePaymentStatusLabel,
} from "@/lib/worker/finance/labels";
import type {
  WorkerFinanceDashboard,
  WorkerFinanceItem,
} from "@/lib/worker/finance/types";
import { getWorkerPaymentMethodLabel } from "@/lib/worker/payments/labels";
import type { WorkerPaymentStatus } from "@/lib/worker/payments/types";
import { cn } from "@/lib/utils";

type FilterValue = "ALL" | WorkerPaymentStatus;

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Aguardando" },
  { value: "PAID", label: "Pago" },
  { value: "FAILED", label: "Falhou" },
  { value: "REFUNDED", label: "Estornado" },
  { value: "CANCELLED", label: "Cancelado" },
];

const STATUS_BADGE_CLASS: Record<WorkerPaymentStatus, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FAILED: "border-rose-200 bg-rose-50 text-rose-800",
  REFUNDED: "border-slate-200 bg-slate-50 text-slate-700",
  CANCELLED: "border-slate-200 bg-slate-50 text-slate-700",
};

const monthlyChartConfig = {
  netReceived: {
    label: "Líquido recebido",
    color: "var(--chart-1)",
  },
  feesRetained: {
    label: "Taxas retidas",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const compositionChartConfig = {
  pending: {
    label: "Aguardando",
    color: "var(--chart-3)",
  },
  available: {
    label: "Disponível",
    color: "var(--chart-1)",
  },
  received: {
    label: "Já recebido",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export default function WorkerFinancePage() {
  const [dashboard, setDashboard] = useState<WorkerFinanceDashboard | null>(
    null,
  );
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getWorkerFinanceDashboardAction();
      setDashboard(result);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (!dashboard) return [];
    if (filter === "ALL") return dashboard.items;
    return dashboard.items.filter((item) => item.paymentStatus === filter);
  }, [dashboard, filter]);

  const summary = dashboard?.summary;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Financeiro
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe o que você tem a receber após a taxa da plataforma
            {summary ? ` (${formatFeeRate(summary.feeRate)})` : ""}.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {loading && !dashboard && !error ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Spinner className="size-5" />
          Carregando financeiro…
        </div>
      ) : null}

      {error && !dashboard ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-4 py-12 text-center">
          <CircleAlert className="size-10 text-destructive" />
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/80 bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                A receber
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-3xl font-bold tracking-tight text-foreground">
                {formatFinanceAmount(summary.toReceiveNet)}
              </p>
              <p className="text-xs text-muted-foreground">
                Bruto {formatFinanceAmount(summary.grossToReceive)} − Taxa{" "}
                {formatFinanceAmount(summary.feesOnToReceive)} = Líquido{" "}
                {formatFinanceAmount(summary.toReceiveNet)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aguardando pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-3xl font-bold tracking-tight text-foreground">
                {formatFinanceAmount(summary.pendingNet)}
              </p>
              <p className="text-xs text-muted-foreground">
                Propostas aceitas com pagamento pendente do cliente
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Já recebido (mês)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-3xl font-bold tracking-tight text-foreground">
                {formatFinanceAmount(summary.receivedThisMonthNet)}
              </p>
              <p className="text-xs text-muted-foreground">
                Valor líquido creditado neste mês
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxas retidas (mês)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-3xl font-bold tracking-tight text-foreground">
                {formatFinanceAmount(summary.feesThisMonth)}
              </p>
              <p className="text-xs text-muted-foreground">
                Taxa da plataforma sobre pagamentos do mês
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {dashboard ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/80 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Evolução mensal
              </CardTitle>
              <CardDescription>
                Líquido recebido versus taxas retidas pela plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={monthlyChartConfig}
                className="aspect-auto h-[280px] w-full"
              >
                <BarChart
                  data={dashboard.monthlyChart}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="3 3"
                    className="stroke-border/60"
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={40}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="netReceived"
                    fill="var(--color-netReceived)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="feesRetained"
                    fill="var(--color-feesRetained)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Composição do financeiro
              </CardTitle>
              <CardDescription>
                Distribuição por valor líquido (aguardando, disponível e já
                recebido)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.composition.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Sem dados para o gráfico de composição.
                </p>
              ) : (
                <ChartContainer
                  config={compositionChartConfig}
                  className="mx-auto aspect-square h-[280px]"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            formatFinanceAmount(Number(value))
                          }
                        />
                      }
                    />
                    <Pie
                      data={dashboard.composition}
                      dataKey="value"
                      nameKey="key"
                      innerRadius={60}
                      outerRadius={100}
                      strokeWidth={2}
                    >
                      {dashboard.composition.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={`var(--color-${entry.key})`}
                        />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="key" />} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {dashboard ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Por proposta
            </h2>
            <p className="text-sm text-muted-foreground">
              Valores bruto, taxa e líquido vinculados às suas propostas.
            </p>
          </div>

          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as FilterValue)}
          >
            <TabsList variant="line" className="w-full flex-wrap justify-start">
              {FILTER_OPTIONS.map((option) => (
                <TabsTrigger key={option.value} value={option.value}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {filteredItems.length === 0 ? (
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Wallet />
                </EmptyMedia>
                <EmptyTitle>
                  {filter === "ALL"
                    ? "Nenhum lançamento financeiro"
                    : "Nenhum lançamento neste status"}
                </EmptyTitle>
                <EmptyDescription>
                  Quando houver propostas aceitas com pagamento, os valores
                  aparecerão aqui.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {filteredItems.map((item) => (
                <FinanceItemCard key={item.paymentId} item={item} />
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function FinanceItemCard({ item }: { item: WorkerFinanceItem }) {
  return (
    <li>
      <Card className="flex h-full flex-col">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
          <div className="min-w-0 space-y-1">
            <p className="text-lg font-semibold text-foreground">
              {formatFinanceAmount(item.netAmount)}
            </p>
            <p className="text-xs text-muted-foreground">
              Líquido a receber · Pedido {item.serviceOrderId.slice(0, 8)}…
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(STATUS_BADGE_CLASS[item.paymentStatus])}
          >
            {getFinancePaymentStatusLabel(item.paymentStatus)}
          </Badge>
        </CardHeader>
        <CardContent className="flex-1 space-y-3">
          <dl className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-muted/50 px-2 py-2">
              <dt className="text-muted-foreground">Bruto</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {formatFinanceAmount(item.grossAmount)}
              </dd>
            </div>
            <div className="rounded-md bg-muted/50 px-2 py-2">
              <dt className="text-muted-foreground">
                Taxa ({formatFeeRate(item.feeRate)})
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {formatFinanceAmount(item.feeAmount)}
              </dd>
            </div>
            <div className="rounded-md bg-muted/50 px-2 py-2">
              <dt className="text-muted-foreground">Líquido</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {formatFinanceAmount(item.netAmount)}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Wallet className="size-3.5" />
              {getWorkerPaymentMethodLabel(item.method)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3.5" />
              {formatFinanceDate(item.paidAt ?? item.createdAt)}
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <Link
            href={`/worker/proposal/${item.proposalId}`}
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            Ver proposta
          </Link>
        </CardFooter>
      </Card>
    </li>
  );
}
