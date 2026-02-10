import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeUrl } from "@/services/external/firecrawl";
import { getStructuredOutput, SchemaType } from "@/services/ai/gemini";
import { searchGoogle } from "@/services/external/serpapi";
import { chatWithClaude } from "@/services/ai/claude";

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ brandId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  let jobId: number | null = null;

  try {
    const { brandId } = await params;
    const id = parseInt(brandId, 10);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid brand ID" },
        { status: 400 }
      );
    }

    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) {
      return NextResponse.json(
        { error: "Brand not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    if (!body.sourceUrl) {
      return NextResponse.json(
        { error: "sourceUrl is required" },
        { status: 400 }
      );
    }

    // Create optimization job
    const job = await prisma.optimizationJob.create({
      data: {
        brandId: id,
        sourceUrl: body.sourceUrl,
        status: "scraping",
      },
    });
    jobId = job.id;

    // Step 1: Scrape the URL
    console.log(`[Optimize] Scraping: ${body.sourceUrl}`);
    const scraped = await scrapeUrl(body.sourceUrl);
    await prisma.optimizationJob.update({
      where: { id: job.id },
      data: { scrapedContent: scraped.markdown, status: "detecting_keyword" },
    });

    // Step 2: Auto-detect target keyword using Gemini
    console.log("[Optimize] Detecting target keyword...");
    const keywordResult = await getStructuredOutput<{ keyword: string }>(
      `Analyze the following web page content and determine the single primary target keyword or keyphrase this content is trying to rank for in search engines. Consider the title, headings, and most frequently discussed topic.\n\nContent:\n${scraped.markdown.slice(0, 5000)}`,
      {
        type: SchemaType.OBJECT,
        properties: {
          keyword: {
            type: SchemaType.STRING,
            description:
              "The primary target keyword or keyphrase this content is optimized for",
          },
        },
        required: ["keyword"],
      }
    );

    await prisma.optimizationJob.update({
      where: { id: job.id },
      data: { targetKeyword: keywordResult.keyword, status: "researching" },
    });

    // Step 3: Research competitors using SerpAPI
    console.log(`[Optimize] Researching competitors for: ${keywordResult.keyword}`);
    const searchResults = await searchGoogle(keywordResult.keyword);

    const competitorContent: string[] = [];
    const topResults = searchResults.organicResults.slice(0, 3);
    for (const result of topResults) {
      try {
        const competitor = await scrapeUrl(result.link);
        competitorContent.push(
          `URL: ${result.link}\nTitle: ${result.title}\n${competitor.markdown.slice(0, 3000)}`
        );
      } catch {
        // Skip competitors that fail to scrape
      }
    }

    await prisma.optimizationJob.update({
      where: { id: job.id },
      data: { status: "analyzing" },
    });

    // Step 4: Generate audit with Claude
    console.log("[Optimize] Generating content audit...");
    const auditPrompt = `You are an expert SEO content auditor. Analyze the following content for the target keyword "${keywordResult.keyword}" and compare it against top-ranking competitors.

## Source Content to Audit
${scraped.markdown.slice(0, 8000)}

## Top-Ranking Competitors
${competitorContent.length > 0 ? competitorContent.map((c, i) => `### Competitor ${i + 1}\n${c}`).join("\n\n") : "No competitor data available."}

## People Also Ask
${searchResults.peopleAlsoAsk.map((q) => `- ${q.question}`).join("\n")}

## Related Searches
${searchResults.relatedSearches.map((s) => `- ${s.query}`).join("\n")}

Score the page from 0-100 across these categories and provide prioritized recommendations. Respond with ONLY valid JSON matching this exact structure:

{
  "overallScore": <number 0-100>,
  "scores": {
    "contentDepth": <number 0-100>,
    "keywordUsage": <number 0-100>,
    "structure": <number 0-100>,
    "readability": <number 0-100>,
    "internalLinking": <number 0-100>
  },
  "summary": "<2-3 sentence summary of the audit findings>",
  "recommendations": [
    {
      "priority": "high" | "medium" | "low",
      "category": "<category name>",
      "description": "<specific actionable recommendation>"
    }
  ]
}`;

    const auditResult = await chatWithClaude(
      auditPrompt,
      "You are a senior SEO content auditor. Always respond with valid JSON only, no markdown code blocks."
    );

    await prisma.optimizationJob.update({
      where: { id: job.id },
      data: { analysisReport: auditResult, status: "completed" },
    });

    // Step 5 (optional): Generate rewrite
    if (body.generateRewrite) {
      await prisma.optimizationJob.update({
        where: { id: job.id },
        data: { status: "rewriting" },
      });

      const writingPrefs = brand.writingPreferences
        ? JSON.parse(brand.writingPreferences)
        : {};

      const rewritePrompt = `You are an expert SEO content writer. Rewrite the following content to improve its SEO performance for the target keyword "${keywordResult.keyword}".

## Current Content
${scraped.markdown.slice(0, 8000)}

## Audit Findings
${auditResult}

## Brand Writing Preferences
${JSON.stringify(writingPrefs, null, 2)}

## Guidelines
- Address all high-priority recommendations from the audit
- Maintain the original topic and intent
- Improve keyword usage naturally
- Enhance content depth and structure
- Add relevant headings and subheadings
- Improve readability

Write the optimized content in markdown format.`;

      const rewrite = await chatWithClaude(
        rewritePrompt,
        "You are an expert SEO content writer. Write high-quality, optimized content in markdown format."
      );

      await prisma.optimizationJob.update({
        where: { id: job.id },
        data: { optimizedRewrite: rewrite, status: "completed" },
      });
    }

    const completed = await prisma.optimizationJob.findUnique({
      where: { id: job.id },
    });

    return NextResponse.json(completed);
  } catch (error) {
    console.error("Optimization failed:", error);

    if (jobId) {
      await prisma.optimizationJob.update({
        where: { id: jobId },
        data: { status: "failed" },
      });
    }

    return NextResponse.json(
      { error: "Optimization failed" },
      { status: 500 }
    );
  }
}
