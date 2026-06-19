// Web Worker entry point: runs puzzle generation off the main thread so
// selecting cells, toggling settings, and animations never jank while a
// new board is being carved.

import { generatePuzzle } from './generator';
import type { WorkerRequest, WorkerResponse } from './types';

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type !== 'generate') return;

  const { given, solution } = generatePuzzle(msg.difficulty);
  const response: WorkerResponse = {
    type: 'generated',
    requestId: msg.requestId,
    given,
    solution,
  };
  (self as unknown as Worker).postMessage(response);
};
