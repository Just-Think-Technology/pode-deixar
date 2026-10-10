// Safe redirect path tests — external-origin rejection

import { describe, it, expect } from "vitest";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

describe("safeRedirectPath", () => {
  const FALLBACK = "/worker/login";

  it("keeps internal absolute paths", () => {
    expect(safeRedirectPath("/worker/orders", FALLBACK)).toBe("/worker/orders");
  });

  it("keeps internal paths with query and hash", () => {
    expect(safeRedirectPath("/client/orders?tab=open#top", FALLBACK)).toBe(
      "/client/orders?tab=open#top",
    );
  });

  it("falls back for null, empty and non-absolute values", () => {
    expect(safeRedirectPath(null, FALLBACK)).toBe(FALLBACK);
    expect(safeRedirectPath("", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirectPath("worker/orders", FALLBACK)).toBe(FALLBACK);
  });

  it("rejects protocol-relative URLs", () => {
    expect(safeRedirectPath("//evil.com", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirectPath("//evil.com/path", FALLBACK)).toBe(FALLBACK);
  });

  it("rejects backslash variants that the URL parser treats as scheme-relative", () => {
    // WHATWG parses "/\evil.com" as "//evil.com" — a naive startsWith("/") check lets it through.
    expect(safeRedirectPath("/\\evil.com", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirectPath("/\\evil.com/path", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirectPath("\\\\evil.com", FALLBACK)).toBe(FALLBACK);
  });

  it("rejects control characters that browsers strip from the authority", () => {
    expect(safeRedirectPath("/\t/evil.com", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirectPath("/\n/evil.com", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirectPath("/\r/evil.com", FALLBACK)).toBe(FALLBACK);
  });

  it("rejects absolute URLs and javascript: scheme", () => {
    expect(safeRedirectPath("https://evil.com", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirectPath("http://evil.com/x", FALLBACK)).toBe(FALLBACK);
    expect(safeRedirectPath("javascript:alert(1)", FALLBACK)).toBe(FALLBACK);
  });

  it("rejects backslashes anywhere in the path", () => {
    expect(safeRedirectPath("/worker\\..\\..\\evil.com", FALLBACK)).toBe(
      FALLBACK,
    );
  });
});