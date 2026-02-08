/**
 * Run analyze flow locally to see the actual error.
 * Usage: node scripts/debug-analyze.js
 */
import "dotenv/config";
import { loadDataset } from "../loaders/loadDataset.js";
import { triageIssue } from "../services/triageService.js";
import { generateKnowledgeArticle } from "../services/kbGenerator.js";
import { findRelevantKB } from "../services/ragService.js";

const conversationId = "CONV-O2RAK1VRJN";

async function main() {
  console.log("Loading dataset...");
  const dataset = loadDataset();
  const convo = dataset.Conversations.find(
    (c) => String(c.Conversation_ID) === String(conversationId)
  );
  if (!convo) {
    console.error("Conversation not found");
    process.exit(1);
  }
  const ticket = dataset.Tickets.find(
    (t) => t.Ticket_Number === convo.Ticket_Number
  );
  if (!ticket) {
    console.error("Ticket not found");
    process.exit(1);
  }

  console.log("Conversation and ticket found.");
  console.log("KnowledgeArticles count:", dataset.KnowledgeArticles?.length ?? "undefined");

  try {
    console.log("\n1. findRelevantKB...");
    const kbCandidate = findRelevantKB(
      dataset.KnowledgeArticles ?? [],
      convo.Transcript ?? ""
    );
    console.log("   kbCandidate:", kbCandidate ? kbCandidate.Title : "None");

    console.log("\n2. triageIssue (OpenAI)...");
    const triage = await triageIssue({
      transcript: convo.Transcript,
      ticket,
      kbCandidate,
    });
    console.log("   triage:", JSON.stringify(triage, null, 2));

    console.log("\n3. generateKnowledgeArticle (OpenAI)...");
    const kbDraft = await generateKnowledgeArticle({
      transcript: convo.Transcript,
      ticket,
    });
    console.log("   kbDraft title:", kbDraft?.Title ?? kbDraft?.title);
  } catch (err) {
    console.error("\n--- ERROR ---");
    console.error("Name:", err.name);
    console.error("Message:", err.message);
    if (err.response) {
      console.error("Response status:", err.response.status);
      console.error("Response data:", JSON.stringify(err.response.data, null, 2));
    }
    console.error("Stack:", err.stack);
    process.exit(1);
  }
  console.log("\nDone.");
}

main();
