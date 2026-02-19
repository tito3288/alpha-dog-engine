import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ brandId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { brandId } = await params;
    const id = parseInt(brandId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid brand ID" }, { status: 400 });
    }

    const brand = await prisma.brand.findUnique({
      where: { id },
      include: { sitemapPages: true },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    return NextResponse.json(brand);
  } catch (error) {
    console.error("Failed to get brand:", error);
    return NextResponse.json(
      { error: "Failed to get brand" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { brandId } = await params;
    const id = parseInt(brandId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid brand ID" }, { status: 400 });
    }

    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.website !== undefined) data.website = body.website;
    if (body.description !== undefined) data.description = body.description;
    if (body.writingPreferences !== undefined)
      data.writingPreferences = JSON.stringify(body.writingPreferences);
    if (body.seoSettings !== undefined)
      data.seoSettings = JSON.stringify(body.seoSettings);
    if (body.imageDefaults !== undefined)
      data.imageDefaults = JSON.stringify(body.imageDefaults);
    if (body.internalLinkingConfig !== undefined)
      data.internalLinkingConfig = JSON.stringify(body.internalLinkingConfig);

    const brand = await prisma.brand.update({
      where: { id },
      data,
    });

    return NextResponse.json(brand);
  } catch (error) {
    console.error("Failed to update brand:", error);
    return NextResponse.json(
      { error: "Failed to update brand" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { brandId } = await params;
    const id = parseInt(brandId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid brand ID" }, { status: 400 });
    }

    await prisma.brand.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete brand:", error);
    return NextResponse.json(
      { error: "Failed to delete brand" },
      { status: 500 }
    );
  }
}
