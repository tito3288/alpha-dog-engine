import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(brands);
  } catch (error) {
    console.error("Failed to list brands:", error);
    return NextResponse.json(
      { error: "Failed to list brands" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.website) {
      return NextResponse.json(
        { error: "name and website are required" },
        { status: 400 }
      );
    }

    const brand = await prisma.brand.create({
      data: {
        name: body.name,
        website: body.website,
        description: body.description ?? null,
        writingPreferences: body.writingPreferences
          ? JSON.stringify(body.writingPreferences)
          : null,
        seoSettings: body.seoSettings
          ? JSON.stringify(body.seoSettings)
          : null,
        imageDefaults: body.imageDefaults
          ? JSON.stringify(body.imageDefaults)
          : null,
        internalLinkingConfig: body.internalLinkingConfig ?? null,
      },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error("Failed to create brand:", error);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}
