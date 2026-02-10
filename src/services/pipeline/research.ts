import { agentLoop, SchemaType } from "@/services/ai/gemini";
import { searchGoogle } from "@/services/external/serpapi";
import { scrapeUrl } from "@/services/external/firecrawl";
import type { ToolDefinition } from "@/services/ai/gemini";

export interface CompetitorInfo {
  url: string;
  keyPoints: string[];
}

export interface SectionHeading {
  heading: string;
  description: string;
}

export interface ContentBrief {
  searchIntent: string;
  topCompetitors: CompetitorInfo[];
  peopleAlsoAsk: string[];
  relatedSearches: string[];
  recommendedStructure: SectionHeading[];
  competitiveGaps: string[];
  targetWordCount: number;
}

export type ProgressEvent =
  | { stage: "searching"; detail: string }
  | { stage: "scraping"; detail: string }
  | { stage: "analyzing"; detail: string }
  | { stage: "complete"; detail: string };

export async function runResearch(
  topic: string,
  options: {
    keywords?: string[];
    brandId: number;
    onProgress?: (event: ProgressEvent) => void;
  }
): Promise<ContentBrief> {
  const { keywords = [], onProgress } = options;

  const emit = (event: ProgressEvent) => {
    console.log(`[Research] ${event.stage}: ${event.detail}`);
    onProgress?.(event);
  };

  emit({ stage: "searching", detail: `Starting research for "${topic}"` });

  const tools: ToolDefinition[] = [
    {
      name: "search_google",
      description:
        "Search Google for a query. Returns organic results, people also ask questions, and related searches.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          query: {
            type: SchemaType.STRING,
            description: "The search query to look up on Google",
          },
        },
        required: ["query"],
      },
      execute: async (args) => {
        const query = args.query as string;
        emit({ stage: "searching", detail: `Searching: "${query}"` });
        const results = await searchGoogle(query);
        return results;
      },
    },
    {
      name: "scrape_url",
      description:
        "Scrape a webpage URL and return its content as markdown along with metadata.",
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          url: {
            type: SchemaType.STRING,
            description: "The URL of the webpage to scrape",
          },
        },
        required: ["url"],
      },
      execute: async (args) => {
        const url = args.url as string;
        emit({ stage: "scraping", detail: `Scraping: ${url}` });
        const result = await scrapeUrl(url);
        return result;
      },
    },
  ];

  const keywordsClause =
    keywords.length > 0
      ? `The target keywords are: ${keywords.join(", ")}.`
      : "";

  const prompt = `You are an expert SEO content researcher. Your task is to research the topic "${topic}" and produce a comprehensive content brief.
${keywordsClause}

IMPORTANT: You MUST use the provided tools to conduct real research. DO NOT make up or hallucinate data.

REQUIRED STEPS (you must complete ALL of these):
1. FIRST: Call search_google for the main topic "${topic}" to get real SERP data
2. THEN: Call search_google for each of the related keywords to gather more data
3. THEN: Call scrape_url on the top 3-5 URLs from the organic search results to analyze their actual content
4. ONLY AFTER gathering all this real data, analyze it to determine:
   - Search intent (informational, transactional, or navigational)
   - Key points from each competitor URL
   - People Also Ask questions (from search results)
   - Related searches (from search results)
   - Content structure based on what's working
   - Competitive gaps and opportunities

After you have called the tools and gathered REAL data, respond with ONLY a JSON object (no markdown fences) matching this exact structure:
{
  "searchIntent": "informational | transactional | navigational",
  "topCompetitors": [
    { "url": "https://actual-competitor.com", "keyPoints": ["point 1", "point 2"] }
  ],
  "peopleAlsoAsk": ["question 1", "question 2"],
  "relatedSearches": ["search 1", "search 2"],
  "recommendedStructure": [
    { "heading": "Section Title", "description": "What this section should cover" }
  ],
  "competitiveGaps": ["gap 1", "gap 2"],
  "targetWordCount": 2000
}

CRITICAL: You cannot respond with the final JSON until you have called search_google and scrape_url multiple times to gather real data. Do not use placeholder URLs like example.com - use the actual URLs from your search results.`;

  emit({ stage: "analyzing", detail: "Running Gemini agent loop" });

  const rawResponse = await agentLoop(prompt, tools);

  emit({ stage: "analyzing", detail: "Parsing content brief" });

  // Extract JSON from the response (handle possible markdown fences)
  let jsonStr = rawResponse.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const brief: ContentBrief = JSON.parse(jsonStr);

  emit({ stage: "complete", detail: "Research brief ready" });

  return brief;
}
