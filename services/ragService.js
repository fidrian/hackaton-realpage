export function findRelevantKB(knowledgeArticles, transcript) {
  const lower = transcript.toLowerCase();

  return knowledgeArticles.find(kb =>
    lower.includes(kb.Title?.toLowerCase() || "")
  );
}