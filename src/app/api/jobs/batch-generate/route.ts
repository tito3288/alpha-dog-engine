import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enqueueJob } from "@/lib/job-queue";

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const idleJobs = await prisma.contentJob.findMany({
      where: { status: "idle" },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    if (idleJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No idle jobs to enqueue",
        enqueued: 0,
      });
    }

    for (const job of idleJobs) {
      enqueueJob(job.id);
    }

    return NextResponse.json({
      success: true,
      message: `Enqueued ${idleJobs.length} jobs`,
      enqueued: idleJobs.length,
      jobIds: idleJobs.map((j) => j.id),
    });
  } catch (error) {
    console.error("Failed to batch enqueue jobs:", error);
    return NextResponse.json(
      { error: "Failed to batch enqueue jobs" },
      { status: 500 }
    );
  }
}
