import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueJob } from "@/lib/job-queue";

type Params = { params: Promise<{ jobId: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { jobId } = await params;
    const id = parseInt(jobId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const job = await prisma.contentJob.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Reset job status to idle before enqueueing
    await prisma.contentJob.update({
      where: { id },
      data: { status: "idle", errorMessage: null },
    });

    enqueueJob(id);

    return NextResponse.json({ success: true, message: `Job ${id} enqueued` });
  } catch (error) {
    console.error("Failed to enqueue job:", error);
    return NextResponse.json(
      { error: "Failed to enqueue job" },
      { status: 500 }
    );
  }
}
