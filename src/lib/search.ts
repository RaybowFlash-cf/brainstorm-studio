export interface SearchProvider {
  name: string;
  search: (query: string) => Promise<SearchResult[]>;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

class DuckDuckGoProvider implements SearchProvider {
  name = 'DuckDuckGo';

  async search(query: string): Promise<SearchResult[]> {
    try {
      const resp = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
      );
      const data = await resp.json();
      const results: SearchResult[] = [];

      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          url: data.AbstractURL || '',
          snippet: data.AbstractText,
        });
      }
      if (data.Answer) {
        results.unshift({
          title: 'Answer',
          url: '',
          snippet: data.Answer,
        });
      }
      return results;
    } catch {
      return [];
    }
  }
}

class WikipediaProvider implements SearchProvider {
  name = 'Wikipedia';

  async search(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      const summaryResp = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`
      );
      if (summaryResp.ok) {
        const wiki = await summaryResp.json();
        if (wiki.extract) {
          results.push({
            title: wiki.title || query,
            url: wiki.content_urls?.desktop?.page || '',
            snippet: wiki.extract,
          });
        }
      }
    } catch {}

    try {
      const searchResp = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=4`
      );
      if (searchResp.ok) {
        const data = await searchResp.json();
        for (const r of data.query?.search || []) {
          if (r.title && r.snippet) {
            results.push({
              title: r.title,
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}`,
              snippet: r.snippet.replace(/<[^>]*>/g, ''),
            });
          }
        }
      }
    } catch {}

    return results;
  }
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  const providers = [new DuckDuckGoProvider(), new WikipediaProvider()];
  const allResults: SearchResult[] = [];

  const searches = providers.map(p => p.search(query));
  const results = await Promise.allSettled(searches);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value);
    }
  }

  const seen = new Set<string>();
  return allResults
    .filter(r => {
      if (seen.has(r.title)) return false;
      seen.add(r.title);
      return true;
    })
    .slice(0, 6);
}
