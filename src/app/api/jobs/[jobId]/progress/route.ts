import { jobBroadcaster } from "@/lib/event-emitter";

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } }
) {
  const jobId = parseInt(params.jobId, 10);

  if (isNaN(jobId)) {
    return new Response("Invalid job ID", { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      // Send initial connection event
      send(JSON.stringify({ status: "connected", jobId }));

      const unsubscribe = jobBroadcaster.subscribe(jobId, (event) => {
        send(JSON.stringify(event));

        if (event.status === "completed" || event.status === "failed") {
          unsubscribe();
          controller.close();
        }
      });

      // Clean up if the client disconnects
      _request.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
