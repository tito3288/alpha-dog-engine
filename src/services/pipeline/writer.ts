import Anthropic from "@anthropic-ai/sdk";
import type { ContentBrief } from "./research";
import type { ArticleImage } from "./images";

// --- Types ---

interface Brand {
  name: string;
  website: string;
  description?: string | null;
  writingPreferences?: string | null;
  voiceSamples?: string | null;
  seoSettings?: string | null;
  internalLinkingConfig?: string | null;
}

interface SitemapPage {
  url: string;
  title?: string | null;
}

type ProgressEvent =
  | { type: "writing"; message: string }
  | { type: "complete"; wordCount: number };

// --- Claude client (lazy init to avoid build-time execution) ---

function getClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

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

  // Parse voice samples
  let voiceSamples: { content: string; title?: string; sourceUrl?: string }[] = [];
  if (brand.voiceSamples) {
    try {
      voiceSamples = typeof brand.voiceSamples === "string"
        ? JSON.parse(brand.voiceSamples)
        : brand.voiceSamples;
    } catch {
      voiceSamples = [];
    }
  }

  // Parse SEO settings
  let seoSettings: Record<string, unknown> = {};
  if (brand.seoSettings) {
    try {
      seoSettings = typeof brand.seoSettings === "string"
        ? JSON.parse(brand.seoSettings)
        : brand.seoSettings;
    } catch {
      seoSettings = {};
    }
  }

  // Parse internal linking config
  let linkingConfig: Record<string, unknown> = {};
  if (brand.internalLinkingConfig) {
    try {
      linkingConfig = typeof brand.internalLinkingConfig === "string"
        ? JSON.parse(brand.internalLinkingConfig)
        : brand.internalLinkingConfig;
    } catch {
      linkingConfig = {};
    }
  }

  const systemPrompt = buildSystemPrompt(brand, writingPrefs, voiceSamples, seoSettings, linkingConfig, images, sitemapPages);
  const userPrompt = buildUserPrompt(researchBrief, seoSettings);

  onProgress?.({ type: "writing", message: "Writing article with Claude..." });

  const client = getClient();
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
  voiceSamples: { content: string; title?: string; sourceUrl?: string }[],
  seoSettings: Record<string, unknown>,
  linkingConfig: Record<string, unknown>,
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

  const voiceSamplesSection =
    voiceSamples.length > 0
      ? `## Voice Reference Samples
Study the following writing samples carefully. Match the writing style, tone, sentence structure, vocabulary choices, and overall feel — then write the article in a similar voice.

${voiceSamples
  .map(
    (s, i) =>
      `### Sample ${i + 1}${s.title ? ` — ${s.title}` : ""}
${s.content.slice(0, 2000)}`
  )
  .join("\n\n")}`
      : "";

  const imageSection =
    images.length > 0
      ? `## Images to Embed
Embed the following images at their specified placements using markdown image syntax. Include alt text and captions where provided.

${images
  .map(
    (img, i) =>
      `Image ${i + 1}:
- Placement: ${img.placement}
- Markdown: ![${img.alt}](${img.url})
${img.caption ? `- Caption: *${img.caption}*` : ""}`
  )
  .join("\n\n")}`
      : "";

  // Build internal linking section with distribution logic
  const primaryOfferUrl = linkingConfig.primaryOfferUrl as string | undefined;
  const primaryOfferPercent = (linkingConfig.primaryOfferPercent as number) || 50;
  const maxLinks = (linkingConfig.maxLinksPerArticle as number) || 5;

  let linkingSection = "";
  if (sitemapPages.length > 0 || primaryOfferUrl) {
    const primaryLinkCount = primaryOfferUrl
      ? Math.round(maxLinks * primaryOfferPercent / 100)
      : 0;
    const otherLinkCount = maxLinks - primaryLinkCount;

    let linkInstructions = `## Internal Linking
Include up to ${maxLinks} internal links total. Use natural anchor text — do not force links. Only link where it genuinely adds value for the reader.\n`;

    if (primaryOfferUrl) {
      linkInstructions += `\n**Primary Offer Page:** Link to ${primaryOfferUrl} approximately ${primaryLinkCount} time(s). This is the brand's main offer/service page — weave links to it naturally where relevant.\n`;
    }

    if (sitemapPages.length > 0 && otherLinkCount > 0) {
      linkInstructions += `\n**Other Pages (up to ${otherLinkCount} links):** Distribute remaining links across these relevant pages:\n${sitemapPages
        .map((page) => `- [${page.title || page.url}](${page.url})`)
        .join("\n")}`;
    }

    linkingSection = linkInstructions;
  }

  // Word count instruction
  const minWords = (seoSettings.minWordCount as number) || 0;
  const maxWords = (seoSettings.maxWordCount as number) || 0;
  const wordCountGuideline =
    minWords && maxWords
      ? `- Target article length: ${minWords} to ${maxWords} words. Aim for comprehensive coverage within this range.`
      : "- Write a comprehensive article of appropriate length for the topic.";

  return `You are an expert SEO content writer. Write a comprehensive, high-quality article based on the research brief provided.

${brandSection}

${voiceSection}

${voiceSamplesSection}

${imageSection}

${linkingSection}

## Writing Guidelines
- Use proper heading hierarchy (H2 for main sections, H3 for subsections). Do NOT include an H1 — the CMS will add the title.
- Write a compelling introduction that hooks the reader and previews what the article covers.
- Write a strong conclusion that summarizes key takeaways.
- Write in markdown format.
- Make the content substantive and valuable — avoid fluff and filler.
- Incorporate "People Also Ask" questions naturally as sections or within the content.
${wordCountGuideline}
- Output ONLY the article markdown. Do not include any meta commentary, preamble, or notes.`;
}

function buildUserPrompt(brief: ContentBrief, seoSettings: Record<string, unknown>): string {
  const minWords = (seoSettings.minWordCount as number) || 0;
  const maxWords = (seoSettings.maxWordCount as number) || 0;
  const wordCountLine =
    minWords && maxWords
      ? `**Target Word Count:** ${minWords} to ${maxWords} words`
      : `**Target Word Count:** ${brief.targetWordCount} words`;

  return `Write an article based on this research brief:

**Search Intent:** ${brief.searchIntent}

${wordCountLine}

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
