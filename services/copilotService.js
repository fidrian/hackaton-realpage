import { findRelevantKB } from "./ragService.js";
import { listGeneratedKB } from "./learningService.js";

function scoreRelevance(query, candidate) {
  const queryLower = query.toLowerCase();
  const titleLower = (candidate.Title || candidate.title || "").toLowerCase();
  const summaryLower = (candidate.ProblemSummary || candidate.problemSummary || candidate.Summary || "").toLowerCase();
  const fullText = (titleLower + " " + summaryLower).toLowerCase();

  const words = queryLower.split(/\s+/).filter(w => w.length > 2);
  let matches = 0;
  for (const word of words) {
    if (fullText.includes(word)) matches++;
  }
  return matches / Math.max(1, words.length);
}

export async function suggestForAgent(query, dataset = {}) {
  const seedArticles = dataset.KnowledgeArticles || [];
  // Score seed KB by relevance (word overlap) so we get results for normal queries
  let seedResults = seedArticles
    .map(kb => ({ ...kb, relevanceScore: scoreRelevance(query, kb) }))
    .filter(kb => kb.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3)
    .map(kb => ({ ...kb, source: "seed" }));
  // Fallback: if no scored match, use strict title-in-query match (legacy)
  if (seedResults.length === 0) {
    const legacySeed = findRelevantKB(seedArticles, query);
    if (legacySeed) seedResults = [{ ...legacySeed, source: "seed", relevanceScore: 1.0 }];
  }

  // retrieve from generated KB
  let generatedResults = [];
  try {
    const generated = await listGeneratedKB();
    generatedResults = generated
      .map(kb => ({
        ...kb,
        relevanceScore: scoreRelevance(query, kb)
      }))
      .filter(kb => kb.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3);
  } catch (err) {
    console.warn("Failed to retrieve generated KB:", err.message);
  }

  // combine and rank
  const allResults = [
    ...seedResults,
    ...generatedResults.map(kb => ({ ...kb, source: "generated" }))
  ];

  // deduplicate and sort
  const unique = [];
  const seen = new Set();
  for (const kb of allResults) {
    const id = kb.KB_Article_ID || kb.Title;
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(kb);
    }
  }

  return unique.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)).slice(0, 5);
}
