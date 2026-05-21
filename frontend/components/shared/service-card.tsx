import { Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { MockService } from "@/mock/types";
import { cn } from "@/lib/utils";

type ServiceCardProps = {
  service: MockService;
  className?: string;
};

export default function ServiceCard({ service, className }: ServiceCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border/80 bg-card shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div
        className="flex h-36 items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5"
        aria-hidden
      >
        <span className="text-4xl font-bold text-primary/30">
          {service.title.charAt(0)}
        </span>
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold leading-snug text-foreground">{service.title}</h3>
            <p className="text-sm text-muted-foreground">{service.providerName}</p>
          </div>
          <Badge variant="outline" className="shrink-0 text-xs">
            {service.category}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-amber-600">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            <span className="font-medium">{service.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({service.reviewCount})</span>
          </div>
          <span className="font-semibold text-primary">{service.priceLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
}
