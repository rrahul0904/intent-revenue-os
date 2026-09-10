import os from "node:os";
import process from "node:process";
import { runWorkerLoop } from "../src/workers/worker";

const once = process.argv.includes("--once");
const workerId =
  process.env.WORKER_ID?.trim() ||
  os.hostname() + ":" + String(process.pid);

let stopping = false;
process.on("SIGTERM", () => {
  stopping = true;
});
process.on("SIGINT", () => {
  stopping = true;
});

console.log(
  JSON.stringify({
    event: "worker_started",
    workerId,
    once,
  }),
);

runWorkerLoop({
  workerId,
  once,
  shouldStop: () => stopping,
})
  .then((result) => {
    console.log(
      JSON.stringify({
        event: "worker_stopped",
        workerId,
        result,
      }),
    );
  })
  .catch((error) => {
    console.error(
      JSON.stringify({
        event: "worker_crashed",
        workerId,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  });
