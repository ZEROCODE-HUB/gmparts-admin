import { liteClient } from "algoliasearch/lite";

const client = liteClient("0CXWHIXYJC", "11c6e86aadf789c9f1067a197da0a3e6");

export async function searchArticlesIndex(query, options = {}) {
  const { results } = await client.search({
    requests: [{ indexName: "Articles", query, ...options }],
  });
  return results[0]?.hits || [];
}

export default client;
