import OpenAI from "openai";

/**
 * Returns a configured OpenAI client.
 * Uses OPENAI_API_KEY (required) and optional OPENAI_ORG_ID from env.
 */
export function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to your environment or a .env file."
    );
  }
  const config = { apiKey: key };
  if (process.env.OPENAI_ORG_ID) {
    config.organization = process.env.OPENAI_ORG_ID;
  }
  return new OpenAI(config);
}
