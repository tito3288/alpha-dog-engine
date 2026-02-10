import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ brandId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { brandId } = await params;
    const id = parseInt(brandId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid brand ID" }, { status: 400 });
    }

    const body = await request.json();
    if (!body.sitemapUrl) {
      return NextResponse.json(
        { error: "sitemapUrl is required" },
        { status: 400 }
      );
    }

    // Verify brand exists
    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Fetch the sitemap XML
    const response = await fetch(body.sitemapUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch sitemap: ${response.statusText}` },
        { status: 422 }
      );
    }

    const xml = await response.text();

    // Parse URLs from sitemap XML
    const urls: string[] = [];
    const locRegex = /<loc>\s*(.*?)\s*<\/loc>/gi;
    let match;
    while ((match = locRegex.exec(xml)) !== null) {
      urls.push(match[1]);
    }

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "No URLs found in sitemap" },
        { status: 422 }
      );
    }

    // Upsert all URLs into SitemapPages
    let created = 0;
    let updated = 0;

    for (const url of urls) {
      const existing = await prisma.sitemapPage.findFirst({
        where: { brandId: id, url },
      });

      if (existing) {
        await prisma.sitemapPage.update({
          where: { id: existing.id },
          data: { lastCrawled: new Date() },
        });
        updated++;
      } else {
        await prisma.sitemapPage.create({
          data: { brandId: id, url, lastCrawled: new Date() },
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      totalUrls: urls.length,
      created,
      updated,
    });
  } catch (error) {
    console.error("Failed to sync sitemap:", error);
    return NextResponse.json(
      { error: "Failed to sync sitemap" },
      { status: 500 }
    );
  }
}
