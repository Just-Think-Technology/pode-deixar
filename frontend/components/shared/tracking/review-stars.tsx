// Review stars — keyboard-navigable 1–5 rating input

"use client";

import { useRef } from "react";

import { getReviewRatingLabel } from "@/lib/tracking/labels";
import { cn } from "@/lib/utils";

const STAR_VALUES = [1, 2, 3, 4, 5];

type ReviewStarsProps = {
  rating: number;
  disabled?: boolean;
  onChange: (rating: number) => void;
};

export function ReviewStars({ rating, disabled, onChange }: ReviewStarsProps) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  function focusStar(value: number): void {
    buttonsRef.current[value - 1]?.focus();
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    value: number,
  ): void {
    if (disabled) {
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = value >= 5 ? 1 : value + 1;
      onChange(next);
      focusStar(next);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      const previous = value <= 1 ? 5 : value - 1;
      onChange(previous);
      focusStar(previous);
    } else if (event.key === "Home") {
      event.preventDefault();
      onChange(1);
      focusStar(1);
    } else if (event.key === "End") {
      event.preventDefault();
      onChange(5);
      focusStar(5);
    }
  }

  return (
    <div>
      <div
        className="flex gap-1"
        role="radiogroup"
        aria-label="Nota da avaliação"
      >
        {STAR_VALUES.map((value) => (
          <button
            key={value}
            ref={(element) => {
              buttonsRef.current[value - 1] = element;
            }}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} de 5 — ${getReviewRatingLabel(value)}`}
            tabIndex={rating === 0 || rating === value ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(value)}
            onKeyDown={(event) => handleKeyDown(event, value)}
            className={cn(
              "rounded-md px-2 py-1 text-2xl transition",
              value <= rating ? "text-[#F2C94C]" : "text-muted-foreground/40",
              "hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            ★
          </button>
        ))}
      </div>
      <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
        {rating >= 1 ? getReviewRatingLabel(rating) : "Escolha uma nota de 1 a 5"}
      </p>
    </div>
  );
}
