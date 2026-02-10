import { EventEmitter } from "events";

export type JobStatus =
  | "researching"
  | "generating_images"
  | "writing"
  | "generating_meta"
  | "generating_thumbnail"
  | "completed"
  | "failed";

export interface JobEvent {
  jobId: number;
  status: JobStatus;
  message: string;
  timestamp: number;
}

export type JobEventCallback = (event: JobEvent) => void;

class JobEventBroadcaster {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(100);
  }

  emit(jobId: number, status: JobStatus, message: string): void {
    const event: JobEvent = {
      jobId,
      status,
      message,
      timestamp: Date.now(),
    };
    this.emitter.emit(`job:${jobId}`, event);
  }

  subscribe(jobId: number, callback: JobEventCallback): () => void {
    const channel = `job:${jobId}`;
    this.emitter.on(channel, callback);
    return () => {
      this.emitter.off(channel, callback);
    };
  }
}

export const jobBroadcaster = new JobEventBroadcaster();
