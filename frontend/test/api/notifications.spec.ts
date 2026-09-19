// Notifications API spec — auth headers, query params, and routes

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fetchMock = vi.fn();

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api/notifications (integration)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "http://api.test");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("fetches with auth and type filter", async () => {
    const { getNotifications } = await import("@/api/notifications");
    fetchMock.mockResolvedValue(jsonResponse([{ id: "1", type: "SERVICE" }]));

    const data = await getNotifications("tok", { type: "SERVICE" });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/notifications?type=SERVICE"),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer tok" }) }),
    );
    expect(data).toEqual([{ id: "1", type: "SERVICE" }]);
  });

  it("fetches with isRead filter as string", async () => {
    const { getNotifications } = await import("@/api/notifications");
    fetchMock.mockResolvedValue(jsonResponse([]));

    await getNotifications("tok", { isRead: false });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("isRead=false"),
      expect.any(Object),
    );
  });

  it("fetches without params when none provided", async () => {
    const { getNotifications } = await import("@/api/notifications");
    fetchMock.mockResolvedValue(jsonResponse([]));

    await getNotifications("tok");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/notifications",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer tok" }) }),
    );
  });

  it("counts unread with Bearer", async () => {
    const { countUnread } = await import("@/api/notifications");
    fetchMock.mockResolvedValue(jsonResponse({ count: 3 }));

    const result = await countUnread("tok-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/notifications/unread-count",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "Bearer tok-123" }),
      }),
    );
    expect(result).toEqual({ count: 3 });
  });

  it("marks single notification as read via POST", async () => {
    const { markNotificationRead, markRead } = await import("@/api/notifications");
    fetchMock.mockResolvedValue(jsonResponse({ count: 1 }));

    await markNotificationRead("tok", "notif-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/notifications/notif-1/read",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer tok" }),
      }),
    );

    fetchMock.mockClear();
    fetchMock.mockResolvedValue(jsonResponse({ count: 1 }));
    await markRead("tok", "notif-2");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/notifications/notif-2/read",
      expect.any(Object),
    );
  });

  it("marks all as read via POST", async () => {
    const { markAllRead } = await import("@/api/notifications");
    fetchMock.mockResolvedValue(jsonResponse({ count: 5 }));

    await markAllRead("tok");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/notifications/read-all",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer tok" }),
      }),
    );
  });
});
