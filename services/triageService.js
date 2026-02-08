import { getOpenAIClient } from "./openaiClient.js";

export async function triageIssue({ transcript, ticket, kbCandidate }) {
  const openai = getOpenAIClient();
  const prompt = `
You are a support intelligence system.

Transcript:
${transcript}

Ticket:
${JSON.stringify(ticket)}

Existing KB:
${kbCandidate ? kbCandidate.Title : "None"}

Decide:
1. Should this be handled by KNOWLEDGE_ARTICLE or SCRIPT?
2. If KNOWLEDGE_ARTICLE, reference KB title if relevant.
3. Give short reasoning.

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
    console.error("Triage JSON parse failed. Raw:", raw.slice(0, 500));
    throw new Error(`Triage response was not valid JSON: ${e.message}`);
  }
}
