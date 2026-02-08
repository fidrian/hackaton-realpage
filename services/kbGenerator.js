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
    messages: [{ role: "user", content: prompt }]
  });

  return JSON.parse(res.choices[0].message.content);
}