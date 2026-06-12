import type { EngineResponse } from "../types/engine.js";

interface PendingResponse {
  resolve: (response: EngineResponse) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

const pendingResponses = new Map<string, PendingResponse>();

export function waitForEngineResponse(
  correlationId: string,
  timeoutMs: number,
): Promise<EngineResponse> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingResponses.delete(correlationId);
      reject(new Error("Engine response timed out"));
    }, timeoutMs);

    pendingResponses.set(correlationId, {
      resolve,
      reject,
      timeout,
    });
  });
}

export function resolveEngineResponse(response: EngineResponse): void {
  const pending = pendingResponses.get(response.correlationId);
  if (!pending) return;

  clearTimeout(pending.timeout);
  pendingResponses.delete(response.correlationId);
  pending.resolve(response);
}
