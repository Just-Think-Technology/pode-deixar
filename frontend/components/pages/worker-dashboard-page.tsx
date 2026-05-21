"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import StatCard from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { WORKER_DASHBOARD_STATS, WORKER_MONTHLY_SERVICES } from "@/mock/worker/dashboard";

const chartConfig = {
  total: {
    label: "Serviços",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export default function WorkerDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Painel do Profissional
        </h1>
        <p className="mt-1 text-muted-foreground">
          Acompanhe seus serviços, solicitações e desempenho.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {WORKER_DASHBOARD_STATS.map((metric) => (
          <StatCard key={metric.title} metric={metric} />
        ))}
      </div>

      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Serviços realizados por mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
            <BarChart data={WORKER_MONTHLY_SERVICES} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="total"
                fill="var(--color-total)"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
