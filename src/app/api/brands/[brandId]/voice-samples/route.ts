import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeUrl } from "@/services/external/firecrawl";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ brandId: string }> };

interface VoiceSample {
  sourceUrl?: string;
  content: string;
  title?: string;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { brandId } = await params;
    const id = parseInt(brandId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid brand ID" }, { status: 400 });
    }

    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    let samples: VoiceSample[] = [];
    if (brand.voiceSamples) {
      try {
        samples = JSON.parse(brand.voiceSamples);
      } catch {
        samples = [];
      }
    }

    if (samples.length >= 5) {
      return NextResponse.json(
        { error: "Maximum of 5 voice samples allowed. Remove one before adding another." },
        { status: 400 }
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let newSample: VoiceSample;

    if (contentType.includes("multipart/form-data")) {
      // Handle PDF file upload
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith(".pdf") && !fileName.endsWith(".txt")) {
        return NextResponse.json(
          { error: "Only PDF and TXT files are supported" },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      let text: string;

      if (fileName.endsWith(".pdf")) {
        const parsed = await pdfParse(buffer);
        text = parsed.text;
      } else {
        text = buffer.toString("utf-8");
      }

      if (!text || text.trim().length === 0) {
        return NextResponse.json(
          { error: "Could not extract text from file" },
          { status: 400 }
        );
      }

      const content = text.trim().slice(0, 5000);
      const title = (formData.get("title") as string) || file.name.replace(/\.(pdf|txt)$/i, "");
      newSample = { content, title };
    } else {
      // Handle JSON body (URL import or text paste)
      const body = await request.json();

      if (body.url) {
        const scraped = await scrapeUrl(body.url);
        const content = scraped.markdown.slice(0, 5000);
        newSample = {
          sourceUrl: body.url,
          content,
          title: scraped.title || undefined,
        };
      } else if (body.content) {
        const content = body.content.slice(0, 5000);
        newSample = {
          content,
          title: body.title || undefined,
        };
      } else {
        return NextResponse.json(
          { error: "Either 'url', 'content', or a file upload is required" },
          { status: 400 }
        );
      }
    }

    samples.push(newSample);

    await prisma.brand.update({
      where: { id },
      data: { voiceSamples: JSON.stringify(samples) },
    });

    return NextResponse.json({ success: true, samples });
  } catch (error) {
    console.error("Failed to add voice sample:", error);
    return NextResponse.json(
      { error: "Failed to add voice sample" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { brandId } = await params;
    const id = parseInt(brandId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid brand ID" }, { status: 400 });
    }

    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const body = await request.json();
    const index = body.index;
    if (typeof index !== "number") {
      return NextResponse.json({ error: "index is required" }, { status: 400 });
    }

    let samples: VoiceSample[] = [];
    if (brand.voiceSamples) {
      try {
        samples = JSON.parse(brand.voiceSamples);
      } catch {
        samples = [];
      }
    }

    if (index < 0 || index >= samples.length) {
      return NextResponse.json({ error: "Invalid index" }, { status: 400 });
    }

    samples.splice(index, 1);

    await prisma.brand.update({
      where: { id },
      data: { voiceSamples: JSON.stringify(samples) },
    });

    return NextResponse.json({ success: true, samples });
  } catch (error) {
    console.error("Failed to delete voice sample:", error);
    return NextResponse.json(
      { error: "Failed to delete voice sample" },
      { status: 500 }
    );
  }
}
