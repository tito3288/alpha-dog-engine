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

Follow these steps:
1. Search Google for the main topic and any related keywords to understand the SERP landscape.
2. Scrape the top 3-5 ranking pages from the organic results to analyze their content.
3. Analyze the search intent (informational, transactional, or navigational).
4. Identify competitive gaps — what the top-ranking pages cover that others miss, and what opportunities exist.
5. Recommend a content structure with headings, sections, and a word count target.

After completing your research, respond with ONLY a JSON object (no markdown fences) matching this exact structure:
{
  "searchIntent": "informational | transactional | navigational",
  "topCompetitors": [
    { "url": "https://...", "keyPoints": ["point 1", "point 2"] }
  ],
  "peopleAlsoAsk": ["question 1", "question 2"],
  "relatedSearches": ["search 1", "search 2"],
  "recommendedStructure": [
    { "heading": "Section Title", "description": "What this section should cover" }
  ],
  "competitiveGaps": ["gap 1", "gap 2"],
  "targetWordCount": 2000
}

Be thorough in your research. Use the search_google tool to explore the topic and related queries. Use the scrape_url tool to deeply analyze the top-ranking content. Then synthesize everything into the JSON brief.`;

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
