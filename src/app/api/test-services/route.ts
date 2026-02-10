import { NextResponse } from "next/server";
import { searchGoogle } from "@/services/external/serpapi";
import { scrapeUrl } from "@/services/external/firecrawl";
import { generateImage } from "@/services/external/falai";

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, unknown> = {};

  // Test 1: SerpAPI
  try {
    const serpResults = await searchGoogle("best bakery in South Bend Indiana");
    console.log("[Test] SerpAPI results:", JSON.stringify(serpResults, null, 2));
    results.serpapi = { success: true, response: serpResults };
  } catch (error) {
    results.serpapi = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Test 2: Firecrawl
  try {
    const scrapeResults = await scrapeUrl("https://alphadogagency.com");
    console.log("[Test] Firecrawl results:", JSON.stringify(scrapeResults, null, 2));
    results.firecrawl = { success: true, response: scrapeResults };
  } catch (error) {
    results.firecrawl = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Test 3: fal.ai
  try {
    const imageResult = await generateImage(
      "a friendly golden retriever wearing sunglasses at a beach"
    );
    console.log("[Test] fal.ai results:", JSON.stringify(imageResult, null, 2));
    results.falai = { success: true, response: imageResult };
  } catch (error) {
    results.falai = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return NextResponse.json(results, { status: 200 });
}
