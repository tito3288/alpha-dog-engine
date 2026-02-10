"use client";

import { useState, useEffect, useRef } from "react";
import type { JobStatus } from "@/lib/event-emitter";

interface JobProgress {
  status: JobStatus | "idle" | "connected";
  message: string;
}

export function useJobProgress(jobId: number | null): JobProgress {
  const [progress, setProgress] = useState<JobProgress>({
    status: "idle",
    message: "",
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const es = new EventSource(`/api/jobs/${jobId}/progress`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress({
        status: data.status,
        message: data.message ?? "",
      });
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [jobId]);

  return progress;
}
