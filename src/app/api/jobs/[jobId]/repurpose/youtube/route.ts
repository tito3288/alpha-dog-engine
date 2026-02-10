import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatWithClaude } from "@/services/ai/claude";
import { jobBroadcaster } from "@/lib/event-emitter";

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
    generateYouTubeScript(id, job.articleContent, job.brand);

    return NextResponse.json(
      { success: true, message: "YouTube script generation started" },
      { status: 202 }
    );
  } catch (error) {
    console.error("Failed to start YouTube repurpose:", error);
    return NextResponse.json(
      { error: "Failed to start YouTube repurpose" },
      { status: 500 }
    );
  }
}

async function generateYouTubeScript(
  jobId: number,
  articleContent: string,
  brand: { name: string; website: string; description: string | null; writingPreferences: string | null }
) {
  try {
    jobBroadcaster.emit(jobId, "generating_youtube", "Generating YouTube script...");

    let writingPrefs = "";
    if (brand.writingPreferences) {
      try {
        const prefs = JSON.parse(brand.writingPreferences);
        writingPrefs = `\n\nBrand voice/tone preferences:\n${JSON.stringify(prefs, null, 2)}`;
      } catch {
        writingPrefs = `\n\nBrand voice/tone: ${brand.writingPreferences}`;
      }
    }

    const systemPrompt = `You are an expert YouTube scriptwriter. You repurpose long-form articles into engaging, well-structured YouTube video scripts that keep viewers watching.

Brand: ${brand.name}
Website: ${brand.website}
${brand.description ? `Description: ${brand.description}` : ""}${writingPrefs}

Write in the brand's voice. Output ONLY the script — no meta commentary or preamble.`;

    const userPrompt = `Turn the following article into a YouTube video script:

Requirements:
- Use clear segment markers: [INTRO], [MAIN POINT 1], [MAIN POINT 2], etc., [CONCLUSION], [CTA]
- Include B-roll suggestions in brackets like [B-ROLL: description of visual]
- Include on-screen text cues in brackets like [ON-SCREEN TEXT: text to display]
- Write in a conversational, spoken tone (not written/formal)
- The intro should hook viewers in the first 10 seconds
- Each main point should flow naturally into the next
- The conclusion should summarize key takeaways
- End with a clear CTA (subscribe, comment, check link in description)
- Aim for a 8-12 minute video script

Article:
${articleContent}`;

    const youtubeScript = await chatWithClaude(userPrompt, systemPrompt);

    await prisma.contentJob.update({
      where: { id: jobId },
      data: { youtubeScript },
    });

    jobBroadcaster.emit(jobId, "completed", "YouTube script generated successfully");
    console.log(`[Repurpose:YouTube] Script generated for job ${jobId}`);
  } catch (error) {
    console.error(`[Repurpose:YouTube] Failed for job ${jobId}:`, error);
    jobBroadcaster.emit(jobId, "failed", "Failed to generate YouTube script");
  }
}
