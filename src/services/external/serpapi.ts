import { getJson } from "serpapi";

export interface OrganicResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
}

export interface PeopleAlsoAsk {
  question: string;
  snippet: string;
  link: string;
}

export interface RelatedSearch {
  query: string;
  link: string;
}

export interface SearchResults {
  organicResults: OrganicResult[];
  peopleAlsoAsk: PeopleAlsoAsk[];
  relatedSearches: RelatedSearch[];
}

export async function searchGoogle(query: string): Promise<SearchResults> {
  console.log(`[SerpAPI] Searching: "${query}"`);

  try {
    const response = await getJson({
      engine: "google",
      q: query,
      api_key: process.env.SERPAPI_KEY,
    });

    const organicResults: OrganicResult[] = (
      response.organic_results ?? []
    ).map((r: Record<string, unknown>) => ({
      position: r.position as number,
      title: r.title as string,
      link: r.link as string,
      snippet: (r.snippet as string) ?? "",
    }));

    const peopleAlsoAsk: PeopleAlsoAsk[] = (
      response.related_questions ?? []
    ).map((r: Record<string, unknown>) => ({
      question: r.question as string,
      snippet: (r.snippet as string) ?? "",
      link: (r.link as string) ?? "",
    }));

    const relatedSearches: RelatedSearch[] = (
      response.related_searches ?? []
    ).map((r: Record<string, unknown>) => ({
      query: r.query as string,
      link: (r.link as string) ?? "",
    }));

    console.log(
      `[SerpAPI] Found ${organicResults.length} results, ${peopleAlsoAsk.length} PAA, ${relatedSearches.length} related`
    );

    return { organicResults, peopleAlsoAsk, relatedSearches };
  } catch (error) {
    console.error("[SerpAPI] Error:", error);
    throw error;
  }
}
