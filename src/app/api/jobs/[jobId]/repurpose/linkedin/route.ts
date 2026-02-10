import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatWithClaude } from "@/services/ai/claude";
import { jobBroadcaster } from "@/lib/event-emitter";

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ jobId: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { jobId } = await params;
    const id = parseInt(jobId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const job = await prisma.contentJob.findUnique({
      where: { id },
      include: { brand: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status !== "completed") {
      return NextResponse.json(
        { error: "Job must be completed before repurposing" },
        { status: 400 }
      );
    }

    if (!job.articleContent) {
      return NextResponse.json(
        { error: "No article content to repurpose" },
        { status: 400 }
      );
    }

    // Kick off async generation
    generateLinkedInPost(id, job.articleContent, job.brand);

    return NextResponse.json(
      { success: true, message: "LinkedIn post generation started" },
      { status: 202 }
    );
  } catch (error) {
    console.error("Failed to start LinkedIn repurpose:", error);
    return NextResponse.json(
      { error: "Failed to start LinkedIn repurpose" },
      { status: 500 }
    );
  }
}

async function generateLinkedInPost(
  jobId: number,
  articleContent: string,
  brand: { name: string; website: string; description: string | null; writingPreferences: string | null }
) {
  try {
    jobBroadcaster.emit(jobId, "generating_linkedin", "Generating LinkedIn post...");

    let writingPrefs = "";
    if (brand.writingPreferences) {
      try {
        const prefs = JSON.parse(brand.writingPreferences);
        writingPrefs = `\n\nBrand voice/tone preferences:\n${JSON.stringify(prefs, null, 2)}`;
      } catch {
        writingPrefs = `\n\nBrand voice/tone: ${brand.writingPreferences}`;
      }
    }

    const systemPrompt = `You are an expert LinkedIn content strategist. You repurpose long-form articles into engaging LinkedIn posts that drive engagement and build thought leadership.

Brand: ${brand.name}
Website: ${brand.website}
${brand.description ? `Description: ${brand.description}` : ""}${writingPrefs}

Write in the brand's voice. Output ONLY the LinkedIn post text — no meta commentary or preamble.`;

    const userPrompt = `Turn the following article into a LinkedIn long-form post:

Requirements:
- Start with a scroll-stopping hook (first line should grab attention — use a bold statement, surprising stat, or provocative question)
- Extract and reformat the key insights for LinkedIn's format (short paragraphs, line breaks between ideas)
- Include 3-5 relevant hashtags at the end
- Keep it under 1300 words but make it substantial
- Use line breaks generously for readability
- End with a conversation-starting question or call to action

Article:
${articleContent}`;

    const linkedinPost = await chatWithClaude(userPrompt, systemPrompt);

    await prisma.contentJob.update({
      where: { id: jobId },
      data: { linkedinPost },
    });

    jobBroadcaster.emit(jobId, "completed", "LinkedIn post generated successfully");
    console.log(`[Repurpose:LinkedIn] Post generated for job ${jobId}`);
  } catch (error) {
    console.error(`[Repurpose:LinkedIn] Failed for job ${jobId}:`, error);
    jobBroadcaster.emit(jobId, "failed", "Failed to generate LinkedIn post");
  }
}
