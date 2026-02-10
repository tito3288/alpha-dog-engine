import { fal } from "@fal-ai/client";

// Lazy initialization to avoid executing during build
let configured = false;
function ensureConfigured() {
  if (!configured) {
    fal.config({
      credentials: process.env.FAL_API_KEY,
    });
    configured = true;
  }
}

interface FalImage {
  url: string;
  width: number;
  height: number;
  content_type: string;
}

interface FalResponse {
  images: FalImage[];
}

export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
}

export async function generateImage(
  prompt: string,
  aspectRatio: string = "16:9",
  quality: string = "hd"
): Promise<GeneratedImage> {
  ensureConfigured();
  console.log(`[fal.ai] Generating image: "${prompt.slice(0, 50)}..."`);

  try {
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt,
        image_size: aspectRatio === "16:9" ? "landscape_16_9" : aspectRatio === "9:16" ? "portrait_16_9" : "square_hd",
        num_images: 1,
        ...(quality === "hd" && { num_inference_steps: 4 }),
      },
    });

    const data = result.data as FalResponse;
    const image = data.images?.[0];

    if (!image) {
      throw new Error("No image returned from fal.ai");
    }

    console.log(`[fal.ai] Image generated: ${image.width}x${image.height}`);

    return {
      url: image.url,
      width: image.width,
      height: image.height,
    };
  } catch (error) {
    console.error("[fal.ai] Error:", error);
    throw error;
  }
}
