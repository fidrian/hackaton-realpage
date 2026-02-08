import OpenAI from "openai";

function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to your environment or a .env file."
    );
  }
  return new OpenAI({ apiKey: key });
}

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
    messages: [{ role: "user", content: prompt }]
  });

  return JSON.parse(res.choices[0].message.content);
}
