// Async operation hook spec — loading guard, friendly errors, retry

import { describe, it, expect, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { ApiError } from "@/api/client/http";
import { useAsyncOperation } from "@/hooks/use-async-operation";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useAsyncOperation", () => {
  it("starts idle without loading or error", () => {
    const { result } = renderHook(() => useAsyncOperation());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets loading while the operation runs and clears after", async () => {
    const { result } = renderHook(() => useAsyncOperation());
    const gate = deferred<string>();

    let outcome: string | null = null;
    act(() => {
      void result.current
        .execute(() => gate.promise)
        .then((value) => {
          outcome = value;
        });
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      gate.resolve("ok");
      await gate.promise;
    });

    expect(outcome).toBe("ok");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("ignores concurrent executions while pending", async () => {
    const { result } = renderHook(() => useAsyncOperation());
    const gate = deferred<string>();
    const second = vi.fn(async () => "second");

    act(() => {
      void result.current.execute(() => gate.promise);
    });
    let secondOutcome: string | null = "unset";
    await act(async () => {
      secondOutcome = await result.current.execute(second);
    });

    expect(secondOutcome).toBeNull();
    expect(second).not.toHaveBeenCalled();

    await act(async () => {
      gate.resolve("first");
      await gate.promise;
    });
  });

  it("maps failures to friendly messages", async () => {
    const { result } = renderHook(() => useAsyncOperation());

    await act(async () => {
      await result.current.execute(async () => {
        throw new ApiError("Validation failed: x must be a UUID", 400, {
          message: "Validation failed: x must be a UUID",
        });
      });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(
      "Verifique os dados informados e tente novamente.",
    );
  });

  it("retries the last operation", async () => {
    const { result } = renderHook(() => useAsyncOperation());
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new ApiError("down", 503, {}))
      .mockResolvedValueOnce("recovered");

    await act(async () => {
      await result.current.execute(operation);
    });
    expect(result.current.error).toContain("conectar");

    await act(async () => {
      await result.current.retry();
    });

    expect(operation).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });

  it("reset clears error state", async () => {
    const { result } = renderHook(() => useAsyncOperation());

    await act(async () => {
      await result.current.execute(async () => {
        throw new ApiError("boom", 500, {});
      });
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });
    expect(result.current.error).toBeNull();
  });
});
