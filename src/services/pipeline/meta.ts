import { getStructuredOutput, SchemaType } from "@/services/ai/gemini";
import { chatWithClaude } from "@/services/ai/claude";
import { generateImage } from "@/services/external/falai";

// --- Types ---

export interface ArticleMeta {
  metaTitle: string;
  metaDescription: string;
  urlSlug: string;
}

type MetaProgressEvent =
  | { type: "generating"; message: string }
  | { type: "complete"; meta: ArticleMeta };

type ThumbnailProgressEvent =
  | { type: "generating_prompt"; message: string }
  | { type: "generating_image"; message: string }
  | { type: "complete"; thumbnailUrl: string };

// --- Schema for Gemini structured output ---

const metaSchema: import("@google/generative-ai").ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    metaTitle: {
      type: SchemaType.STRING,
      description:
        "SEO meta title under 60 characters. Must include the primary keyword naturally.",
    },
    metaDescription: {
      type: SchemaType.STRING,
      description:
        "Compelling meta description under 160 characters with a call to action.",
    },
    urlSlug: {
      type: SchemaType.STRING,
      description:
        "URL-friendly slug: lowercase, hyphenated, concise. No trailing slashes or special characters.",
    },
  },
  required: ["metaTitle", "metaDescription", "urlSlug"],
};

// --- generateMeta ---

export async function generateMeta(
  articleMarkdown: string,
  onProgress?: (event: MetaProgressEvent) => void
): Promise<ArticleMeta> {
  console.log("[Pipeline:Meta] Generating meta tags...");
  onProgress?.({ type: "generating", message: "Generating meta title, description, and URL slug..." });

  const prompt = `You are an expert SEO specialist. Analyze the following article and generate optimized metadata.

Rules:
- metaTitle: Under 60 characters. Include the primary keyword. Make it compelling and click-worthy.
- metaDescription: Under 160 characters. Summarize the value of the article with a clear call to action.
- urlSlug: Lowercase, hyphenated, concise (3-5 words max). No stop words unless necessary for clarity.

Article:
${articleMarkdown}`;

  const meta = await getStructuredOutput<ArticleMeta>(prompt, metaSchema);

  console.log(`[Pipeline:Meta] Generated — title: "${meta.metaTitle}" | slug: "${meta.urlSlug}"`);
  onProgress?.({ type: "complete", meta });

  return meta;
}

// --- generateThumbnail ---

export async function generateThumbnail(
  articleMarkdown: string,
  brand: { name: string; website: string; description?: string | null; imageDefaults?: string | null },
  onProgress?: (event: ThumbnailProgressEvent) => void
): Promise<string> {
  console.log("[Pipeline:Thumbnail] Generating thumbnail...");
  onProgress?.({ type: "generating_prompt", message: "Creating thumbnail description with Claude..." });

  // Parse image defaults if stored as JSON string
  let imageDefaults: { aspectRatio?: string; quality?: string; style?: string } = {};
  if (brand.imageDefaults) {
    try {
      imageDefaults =
        typeof brand.imageDefaults === "string"
          ? JSON.parse(brand.imageDefaults)
          : brand.imageDefaults;
    } catch {
      imageDefaults = {};
    }
  }

  const brandContext = [
    `Brand: ${brand.name}`,
    `Website: ${brand.website}`,
    brand.description ? `Description: ${brand.description}` : null,
    imageDefaults.style ? `Visual style: ${imageDefaults.style}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const imagePrompt = await chatWithClaude(
    `Generate a single, detailed image prompt for a thumbnail that represents this article's topic. The thumbnail should be eye-catching, professional, and suitable for social media sharing.

${brandContext}

Article:
${articleMarkdown.slice(0, 3000)}

Respond with ONLY the image generation prompt — no explanation, no quotes, no preamble.`,
    "You are an expert visual designer who creates detailed AI image generation prompts. Your prompts produce clean, professional, visually striking images suitable for article thumbnails and social media cards."
  );

  console.log(`[Pipeline:Thumbnail] Image prompt generated (${imagePrompt.length} chars)`);
  onProgress?.({ type: "generating_image", message: "Generating thumbnail image..." });

  const { aspectRatio = "16:9", quality = "hd" } = imageDefaults;
  const generated = await generateImage(imagePrompt.trim(), aspectRatio, quality);

  console.log(`[Pipeline:Thumbnail] Thumbnail generated: ${generated.url}`);
  onProgress?.({ type: "complete", thumbnailUrl: generated.url });

  return generated.url;
}
