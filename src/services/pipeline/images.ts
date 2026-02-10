import { getStructuredOutput, SchemaType } from "@/services/ai/gemini";
import { generateImage } from "@/services/external/falai";

// --- Types ---

export interface ImageSpec {
  placement: string;
  imagePrompt: string;
  altText: string;
  caption: string | null;
}

export interface ArticleImage {
  placement: string;
  url: string;
  alt: string;
  caption: string | null;
}

export interface ImageDefaults {
  aspectRatio?: string;
  quality?: string;
  style?: string;
}

type ProgressEvent =
  | { type: "generating_specs"; message: string }
  | { type: "specs_ready"; count: number }
  | { type: "generating_image"; index: number; total: number; placement: string }
  | { type: "image_complete"; index: number; total: number; placement: string }
  | { type: "image_failed"; index: number; total: number; placement: string; error: string }
  | { type: "complete"; images: ArticleImage[] };

// --- Schema for Gemini structured output ---

const imageSpecsSchema: import("@google/generative-ai").ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    specs: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          placement: {
            type: SchemaType.STRING,
            description:
              "Where this image should appear in the article (e.g., 'after introduction', 'in section 2', 'before conclusion')",
          },
          imagePrompt: {
            type: SchemaType.STRING,
            description:
              "Detailed description for the AI image generator. Be specific about style, composition, colors, and subject matter.",
          },
          altText: {
            type: SchemaType.STRING,
            description: "SEO-friendly alt text describing the image content",
          },
          caption: {
            type: SchemaType.STRING,
            description:
              "Optional caption to display below the image. Use empty string if no caption needed.",
          },
        },
        required: ["placement", "imagePrompt", "altText", "caption"],
      },
    },
  },
  required: ["specs"],
};

// --- Main function ---

export async function generateArticleImages(
  researchBrief: string,
  imageDefaults: ImageDefaults = {},
  onProgress?: (event: ProgressEvent) => void
): Promise<ArticleImage[]> {
  console.log("[Pipeline:Images] Starting image generation...");

  const { aspectRatio = "16:9", quality = "hd", style = "" } = imageDefaults;

  // Step 1: Generate image specs from the research brief
  onProgress?.({ type: "generating_specs", message: "Analyzing research brief for image opportunities..." });

  const styleInstruction = style
    ? `All images should follow this style: ${style}.`
    : "Use a clean, professional, modern style.";

  const prompt = `You are an expert content strategist. Based on the following research brief, generate 3-4 strategic image specifications for an article. Each image should enhance the reader's understanding, break up text, and add visual interest.

${styleInstruction}

Images should:
- Support key points in the article
- Be varied in subject matter (don't repeat similar images)
- Have detailed, specific prompts that will produce high-quality AI-generated images
- Include SEO-optimized alt text with relevant keywords

Research Brief:
${researchBrief}`;

  const result = await getStructuredOutput<{ specs: ImageSpec[] }>(prompt, imageSpecsSchema);
  const specs = result.specs;

  console.log(`[Pipeline:Images] Generated ${specs.length} image specs`);
  onProgress?.({ type: "specs_ready", count: specs.length });

  // Step 2: Generate images from specs, handling failures gracefully
  const images: ArticleImage[] = [];

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];

    onProgress?.({
      type: "generating_image",
      index: i + 1,
      total: specs.length,
      placement: spec.placement,
    });

    try {
      console.log(`[Pipeline:Images] Generating image ${i + 1}/${specs.length}: "${spec.placement}"`);
      const generated = await generateImage(spec.imagePrompt, aspectRatio, quality);

      images.push({
        placement: spec.placement,
        url: generated.url,
        alt: spec.altText,
        caption: spec.caption || null,
      });

      onProgress?.({
        type: "image_complete",
        index: i + 1,
        total: specs.length,
        placement: spec.placement,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Pipeline:Images] Failed to generate image ${i + 1}: ${message}`);

      onProgress?.({
        type: "image_failed",
        index: i + 1,
        total: specs.length,
        placement: spec.placement,
        error: message,
      });
      // Continue with remaining images
    }
  }

  console.log(`[Pipeline:Images] Complete: ${images.length}/${specs.length} images generated`);
  onProgress?.({ type: "complete", images });

  return images;
}
