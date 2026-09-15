import { describe, expect, it } from "vitest";

import { isSafeImageUrl, toSafeImageUrl } from "@/lib/tracking/image";

describe("lib/tracking/image", () => {
  describe("isSafeImageUrl", () => {
    it.each([
      "https://minio/order-photos/uuid.webp",
      "http://localhost:9000/order-photos/uuid.webp",
      "blob:http://localhost:3000/uuid",
      "data:image/svg+xml;charset=utf-8,%3Csvg%3E",
      "  HTTPS://example.com/photo.png  ",
    ])("aceita %s", (url) => {
      expect(isSafeImageUrl(url)).toBe(true);
    });

    it.each([
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "",
    ])("rejeita %s", (url) => {
      expect(isSafeImageUrl(url)).toBe(false);
    });
  });

  describe("toSafeImageUrl", () => {
    it("preserva URLs seguras e neutraliza as demais", () => {
      expect(toSafeImageUrl("https://example.com/a.webp")).toBe(
        "https://example.com/a.webp",
      );
      expect(toSafeImageUrl("javascript:alert(1)")).toBe("about:blank");
    });
  });
});
