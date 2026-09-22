// E2E reset route — resets mock stores when NEXT_PUBLIC_USE_MOCK is enabled
// Only exposed in E2E/dev mode; returns 404 otherwise

import { NextResponse } from "next/server";

export async function POST() {
  if (process.env.NEXT_PUBLIC_USE_MOCK !== "true" && process.env.NEXT_E2E !== "true") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  try {
    const { resetMockClientOrders } = await import("@/mock/client/orders");
    resetMockClientOrders();
  } catch {
    // ignore if mock not available
  }

  try {
    const { resetMockNotifications } = await import("@/mock/notifications");
    resetMockNotifications();
  } catch {
    // ignore
  }

  try {
    const { resetMockWorkerReviews } = await import("@/mock/worker/reviews");
    resetMockWorkerReviews();
  } catch {
    // ignore
  }

  try {
    const { resetMockTracking } = await import("@/mock/tracking");
    // optional: tracking mocks may expose reset
    if (typeof resetMockTracking === "function") resetMockTracking();
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return POST();
}
