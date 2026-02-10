import FirecrawlApp from "@mendable/firecrawl-js";

// Lazy initialization to avoid executing during build
function getFirecrawl() {
  return new FirecrawlApp({
    apiKey: process.env.FIRECRAWL_API_KEY ?? "",
  });
}

export interface ScrapeResult {
  markdown: string;
  title?: string;
  description?: string;
  url?: string;
  links?: string[];
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  console.log(`[Firecrawl] Scraping: ${url}`);

  try {
    const firecrawl = getFirecrawl();
    const result = await firecrawl.scrapeUrl(url, {
      formats: ["markdown", "links"],
    });

    if (!result.success) {
      throw new Error(`Firecrawl scrape failed: ${result.error}`);
    }

    console.log(`[Firecrawl] Scraped successfully (${result.markdown?.length ?? 0} chars)`);

    return {
      markdown: result.markdown ?? "",
      title: result.metadata?.title,
      description: result.metadata?.description,
      url: result.url,
      links: result.links,
    };
  } catch (error) {
    console.error("[Firecrawl] Error:", error);
    throw error;
  }
}
