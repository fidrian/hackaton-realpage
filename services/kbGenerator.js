import { getOpenAIClient } from "./openaiClient.js";

export async function generateKnowledgeArticle({ transcript, ticket }) {
  const openai = getOpenAIClient();
  const prompt = `
Generate a knowledge article from the following support case.

Transcript:
${transcript}

Ticket Resolution:
${ticket.Resolution}

Include:
- Title
- Problem Summary
- Resolution Steps
- Preconditions
- Source Ticket_Number

Return JSON only.
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  const raw = res.choices[0]?.message?.content?.trim() || "";
  const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("KB generator JSON parse failed. Raw:", raw.slice(0, 500));
    throw new Error(`KB article response was not valid JSON: ${e.message}`);
  }
}