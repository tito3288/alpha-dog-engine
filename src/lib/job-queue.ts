import { runContentPipeline } from "@/services/pipeline/orchestrator";

const queue: number[] = [];
let processing = false;

export function enqueueJob(jobId: number): void {
  console.log(`[Queue] Enqueued job ${jobId} (queue length: ${queue.length + 1})`);
  queue.push(jobId);

  if (!processing) {
    processNext();
  }
}

async function processNext(): Promise<void> {
  if (queue.length === 0) {
    processing = false;
    return;
  }

  processing = true;
  const jobId = queue.shift()!;

  console.log(`[Queue] Processing job ${jobId} (${queue.length} remaining)`);

  try {
    await runContentPipeline(jobId);
  } catch (error) {
    console.error(`[Queue] Unexpected error for job ${jobId}:`, error);
  }

  processNext();
}
