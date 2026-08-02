"use client";

/**
 * Spawns the one tool worker and drives a single job through it.
 *
 * The `new URL("./tool.worker.ts", import.meta.url)` below must stay written
 * out literally — that inline form is the only shape a bundler recognises as a
 * worker entry. Nothing worker-only may be imported here.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import type { ToolPagePreview } from "./run";
import {
  beginWorkerJob,
  cancelWorkerJob,
  createToolInspectRequest,
  createToolJobState,
  createToolWorkerRequest,
  getRequestTransferables,
  isToolWorkerResponse,
  reduceWorkerJobState,
  type ToolInspectRequestInput,
  type ToolJobState,
  type ToolRunRequestInput,
  type ToolWorkerMessage,
} from "./workerProtocol";

export type ToolRunHandle = {
  readonly state: ToolJobState;
  /** Page geometry from the last completed inspection; empty until then. */
  readonly previews: readonly ToolPagePreview[];
  /** Starts a job, replacing any job already running. Returns its id. */
  readonly start: (request: ToolRunRequestInput) => string;
  /** Starts a page inspection, replacing any job already running. */
  readonly inspect: (request: ToolInspectRequestInput) => string;
  readonly cancel: () => void;
  readonly reset: () => void;
};

export function useToolRun(): ToolRunHandle {
  const [state, setState] = useState<ToolJobState>(createToolJobState);
  const stateRef = useRef(state);
  const workerRef = useRef<Worker | null>(null);

  const apply = useCallback((next: ToolJobState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => terminate, [terminate]);

  /** One job at a time: every dispatch replaces the worker and the job state. */
  const dispatch = useCallback(
    (message: ToolWorkerMessage, transfer: Transferable[]): string => {
      terminate();
      const worker = new Worker(
        new URL("./tool.worker.ts", import.meta.url),
        { name: "smarttools-tool-worker" },
      );
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<unknown>) => {
        if (workerRef.current !== worker) return;
        if (!isToolWorkerResponse(event.data)) return;
        const next = reduceWorkerJobState(stateRef.current, event.data);
        if (next.status !== "running") terminate();
        apply(next);
      };
      apply(beginWorkerJob(stateRef.current, message.jobId));
      worker.postMessage(message, transfer);
      return message.jobId;
    },
    [apply, terminate],
  );

  const start = useCallback(
    (request: ToolRunRequestInput): string => {
      const message = createToolWorkerRequest({
        ...request,
        jobId: crypto.randomUUID(),
      });
      return dispatch(message, getRequestTransferables(message));
    },
    [dispatch],
  );

  // No transferables: the caller keeps reading the same buffer for its hooks,
  // and transferring it would detach the copy it still holds.
  const inspect = useCallback(
    (request: ToolInspectRequestInput): string =>
      dispatch(
        createToolInspectRequest({ ...request, jobId: crypto.randomUUID() }),
        [],
      ),
    [dispatch],
  );

  const cancel = useCallback(() => {
    const canceled = cancelWorkerJob(stateRef.current);
    if (!canceled) return;
    workerRef.current?.postMessage(canceled.message);
    terminate();
    apply(canceled.state);
  }, [apply, terminate]);

  const reset = useCallback(() => {
    terminate();
    apply(createToolJobState());
  }, [apply, terminate]);

  return { state, previews: state.previews, start, inspect, cancel, reset };
}
