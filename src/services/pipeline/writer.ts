import Anthropic from "@anthropic-ai/sdk";
import type { ContentBrief } from "./research";
import type { ArticleImage } from "./images";

// --- Types ---

interface Brand {
  name: string;
  website: string;
  description?: string | null;
  writingPreferences?: string | null;
}

interface SitemapPage {
  url: string;
  title?: string | null;
}

type ProgressEvent =
  | { type: "writing"; message: string }
  | { type: "complete"; wordCount: number };

// --- Claude client ---

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// --- Main function ---

export async function writeArticle(
  researchBrief: ContentBrief,
  images: ArticleImage[],
  brand: Brand,
  sitemapPages: SitemapPage[],
  onProgress?: (event: ProgressEvent) => void
): Promise<string> {
  console.log("[Pipeline:Writer] Starting article writing...");
  onProgress?.({ type: "writing", message: "Preparing article prompt..." });

  // Parse writing preferences if stored as JSON string
  let writingPrefs: Record<string, unknown> = {};
  if (brand.writingPreferences) {
    try {
      writingPrefs =
        typeof brand.writingPreferences === "string"
          ? JSON.parse(brand.writingPreferences)
          : brand.writingPreferences;
    } catch {
      writingPrefs = { raw: brand.writingPreferences };
    }
  }

  const systemPrompt = buildSystemPrompt(brand, writingPrefs, images, sitemapPages);
  const userPrompt = buildUserPrompt(researchBrief);

  onProgress?.({ type: "writing", message: "Writing article with Claude..." });

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 16384,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in Claude response");
  }

  const article = textBlock.text;
  const wordCount = article.split(/\s+/).length;

  console.log(
    `[Pipeline:Writer] Article written (${wordCount} words, ${message.usage.input_tokens} in, ${message.usage.output_tokens} out)`
  );
  onProgress?.({ type: "complete", wordCount });

  return article;
}

// --- Prompt builders ---

function buildSystemPrompt(
  brand: Brand,
  writingPrefs: Record<string, unknown>,
  images: ArticleImage[],
  sitemapPages: SitemapPage[]
): string {
  const brandSection = `## Brand Information
- Brand name: ${brand.name}
- Website: ${brand.website}
${brand.description ? `- Description: ${brand.description}` : ""}

Naturally mention the brand where it fits organically. Do NOT force brand mentions — only include them where they add value or are contextually relevant.`;

  const voiceSection =
    Object.keys(writingPrefs).length > 0
      ? `## Writing Voice & Tone
Match the following writing preferences:
${JSON.stringify(writingPrefs, null, 2)}`
      : `## Writing Voice & Tone
Write in a clear, professional, and engaging tone.`;

  const imageSection =
    images.length > 0
      ? `## Images to Embed
Embed the following images at their specified placements using markdown image syntax. Include alt text and captions where provided.

${images
  .map(
    (img, i) =>
      `Image ${i + 1}:
- Placement: ${img.placement}
- Markdown: ![${img.altText}](${img.imageUrl})
${img.caption ? `- Caption: *${img.caption}*` : ""}`
  )
  .join("\n\n")}`
      : "";

  const linkingSection =
    sitemapPages.length > 0
      ? `## Internal Linking
Include internal links to relevant pages from the brand's site. Use natural anchor text — do not force links. Only link where it genuinely adds value for the reader.

Available pages:
${sitemapPages
  .map((page) => `- [${page.title || page.url}](${page.url})`)
  .join("\n")}`
      : "";

  return `You are an expert SEO content writer. Write a comprehensive, high-quality article based on the research brief provided.

${brandSection}

${voiceSection}

${imageSection}

${linkingSection}

## Writing Guidelines
- Use proper heading hierarchy (H2 for main sections, H3 for subsections). Do NOT include an H1 — the CMS will add the title.
- Write a compelling introduction that hooks the reader and previews what the article covers.
- Write a strong conclusion that summarizes key takeaways.
- Write in markdown format.
- Make the content substantive and valuable — avoid fluff and filler.
- Incorporate "People Also Ask" questions naturally as sections or within the content.
- Output ONLY the article markdown. Do not include any meta commentary, preamble, or notes.`;
}

function buildUserPrompt(brief: ContentBrief): string {
  return `Write an article based on this research brief:

**Search Intent:** ${brief.searchIntent}

**Target Word Count:** ${brief.targetWordCount} words

**Recommended Structure:**
${brief.recommendedStructure
  .map((s) => `- ${s.heading}: ${s.description}`)
  .join("\n")}

**People Also Ask:**
${brief.peopleAlsoAsk.map((q) => `- ${q}`).join("\n")}

**Competitive Gaps to Address:**
${brief.competitiveGaps.map((g) => `- ${g}`).join("\n")}

**Related Searches to Consider:**
${brief.relatedSearches.map((s) => `- ${s}`).join("\n")}

**Top Competitor Key Points:**
${brief.topCompetitors
  .map((c) => `- ${c.url}: ${c.keyPoints.join("; ")}`)
  .join("\n")}`;
}
