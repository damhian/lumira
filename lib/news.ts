export async function fetchArticles(
  categories: string[],
): Promise<Array<{ title: string; url: string; category: string }>> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // Articles from the last 7 days

  const promises = categories.map(async (category) => {
    try {
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(
          category,
        )}&from=${since}&sortBy=publishedAt&apiKey=${process.env.NEWS_API_KEY}`,
      );
      if (!response.ok) {
        console.error("Failed fetching from this category", category);
        return [];
      }

      const data = await response.json();
      return data.articles.slice(0, 5).map((article: any) => ({
        title: article.title || "No title",
        url: article.url || "#",
        description: article.description || "No description available",
      }));
    } catch (error) {
      console.error(error);
      return [];
    }
  });

  const result = await Promise.all(promises);
  return result.flat();
}
