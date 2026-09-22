// Star display — read-only fractional rating with accessible label

import { Star } from "lucide-react";

import { formatAverage } from "@/lib/client/reviews/mappers";
import { cn } from "@/lib/utils";

type StarDisplayProps = {
  value: number;
  className?: string;
};

function StarRow({ filled }: { filled: boolean }) {
  return (
    <div className="flex items-center" aria-hidden={filled ? undefined : true}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            "size-4",
            filled ? "fill-amber-400 text-amber-400" : "fill-muted text-muted",
          )}
        />
      ))}
    </div>
  );
}

export default function StarDisplay({ value, className }: StarDisplayProps) {
  const percentage = Math.min(Math.max(value / 5, 0), 1) * 100;

  return (
    <span
      role="img"
      aria-label={`${formatAverage(value)} de 5`}
      className={cn("relative inline-flex", className)}
    >
      <StarRow filled={false} />
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${percentage}%` }}
      >
        <StarRow filled />
      </span>
    </span>
  );
}
