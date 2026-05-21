import { TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatMetric } from "@/mock/types";
import { cn } from "@/lib/utils";

type StatCardProps = {
  metric: StatMetric;
  className?: string;
};

export default function StatCard({ metric, className }: StatCardProps) {
  return (
    <Card className={cn("border-border/80 bg-card shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {metric.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-3xl font-bold tracking-tight text-foreground">{metric.value}</p>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {metric.trend === "up" && <TrendingUp className="size-4 text-secondary" />}
          <span>{metric.subtitle}</span>
        </div>
      </CardContent>
    </Card>
  );
}
