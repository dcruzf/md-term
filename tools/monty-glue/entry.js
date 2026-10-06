// Browser entry for Monty, bundled into src/md_term/runtimes/monty/monty.js.
//
// It mirrors Monty's own browserWorkerFactory, but keeps a handle on the Web
// Workers it spawns: terminating them is the only way to interrupt a running
// feed (Ctrl+C), since closing a session waits for the feed to finish.

import { WorkerChannel } from "./node_modules/@pydantic/monty/dist/worker/channel.js";
import {
  createWorkerPoolFromFactory,
  workerChannelOptions,
} from "./node_modules/@pydantic/monty/dist/worker/poolOptions.js";

export async function createPool(modules, workerUrl, options = {}) {
  const workers = new Set();
  const factory = (signal) => {
    const worker = new Worker(workerUrl, { type: "module" });
    workers.add(worker);
    worker.postMessage({ init: true, modules });
    const like = {
      post: (message) => worker.postMessage(message),
      onMessage: (handler) => worker.addEventListener("message", (event) => handler(event.data)),
      onError: (handler) => worker.addEventListener("error", (event) => handler(event)),
      terminate: () => {
        workers.delete(worker);
        worker.terminate();
      },
    };
    return WorkerChannel.create(like, workerChannelOptions(options), signal);
  };
  const pool = await createWorkerPoolFromFactory(factory, options, 1);
  return {
    pool,
    kill() {
      for (const worker of workers) worker.terminate();
      workers.clear();
    },
  };
}
