"use client";

import type { PopularCategory } from "@/lib/client/search/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CategoryCardProps = {
  category: PopularCategory;
  isSelected?: boolean;
  onSelect: (categoryId: string) => void;
};

export default function CategoryCard({
  category,
  isSelected = false,
  onSelect,
}: CategoryCardProps) {
  const Icon = category.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(category.id)}
      className="w-full text-left"
    >
      <Card
        className={cn(
          "border-border/80 bg-card py-0 shadow-sm transition-all hover:border-primary/30 hover:shadow-md",
          isSelected && "border-primary ring-2 ring-primary/20",
        )}
      >
        <CardContent className="flex flex-col items-center gap-3 px-4 py-5">
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-xl",
              category.iconBgClassName,
            )}
          >
            <Icon className={cn("size-6", category.iconClassName)} />
          </div>
          <span className="text-sm font-medium text-foreground">{category.label}</span>
        </CardContent>
      </Card>
    </button>
  );
}
