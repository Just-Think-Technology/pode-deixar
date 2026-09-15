import { describe, expect, it } from "vitest";

import { getReviewRatingLabel } from "@/lib/tracking/labels";

describe("lib/tracking/labels review rating", () => {
  it("descreve cada nota de 1 a 5", () => {
    expect(getReviewRatingLabel(1)).toBe("Muito ruim");
    expect(getReviewRatingLabel(2)).toBe("Ruim");
    expect(getReviewRatingLabel(3)).toBe("Regular");
    expect(getReviewRatingLabel(4)).toBe("Bom");
    expect(getReviewRatingLabel(5)).toBe("Excelente");
  });

  it("recorre ao formato numérico fora do intervalo", () => {
    expect(getReviewRatingLabel(0)).toBe("0 de 5");
  });
});
