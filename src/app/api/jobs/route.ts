import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (brandId) where.brandId = parseInt(brandId, 10);
    if (status) where.status = status;

    const jobs = await prisma.contentJob.findMany({
      where,
      include: { brand: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Failed to list jobs:", error);
    return NextResponse.json(
      { error: "Failed to list jobs" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.brandId || !body.topic) {
      return NextResponse.json(
        { error: "brandId and topic are required" },
        { status: 400 }
      );
    }

    // Verify brand exists
    const brand = await prisma.brand.findUnique({
      where: { id: body.brandId },
    });
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const job = await prisma.contentJob.create({
      data: {
        brandId: body.brandId,
        topic: body.topic,
        keywords: body.keywords ?? null,
      },
      include: { brand: true },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Failed to create job:", error);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500 }
    );
  }
}
