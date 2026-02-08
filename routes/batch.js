import express from "express";
import { triageIssue } from "../services/triageService.js";
import { generateKnowledgeArticle } from "../services/kbGenerator.js";
import { saveGeneratedKB } from "../services/learningService.js";
import { findRelevantKB } from "../services/ragService.js";

const router = express.Router();

export default function batchRoute(dataset) {
  /**
   * POST /api/learn-from-dataset
   * Bulk learning from entire Excel dataset
   */
  router.post("/learn-from-dataset", async (req, res) => {
    const summary = {
      total_conversations: dataset.Conversations.length,
      processed: 0,
      generated_kb: 0,
      skipped: 0
    };

    const results = [];

    for (const convo of dataset.Conversations) {
      const ticket = dataset.Tickets.find(
        t => t.Ticket_Number === convo.Ticket_Number
      );

      // Only learn from resolved tickets
      if (!ticket || !ticket.Resolution) {
        summary.skipped++;
        continue;
      }

      summary.processed++;

      const kbCandidate = findRelevantKB(
        dataset.KnowledgeArticles,
        convo.Transcript || ""
      );

      const triage = await triageIssue({
        transcript: convo.Transcript || "",
        ticket,
        kbCandidate
      });

      if (triage.decision !== "KNOWLEDGE_ARTICLE") {
        summary.skipped++;
        continue;
      }

      const kbDraft = await generateKnowledgeArticle({
        transcript: convo.Transcript || "",
        ticket
      });

      const savedKB = await saveGeneratedKB(kbDraft, {
        ticketNumber: ticket.Ticket_Number,
        conversationId: convo.Conversation_ID,
        source: "batch"
      });

      summary.generated_kb++;

      results.push({
        Conversation_ID: convo.Conversation_ID,
        Ticket_Number: ticket.Ticket_Number,
        KB_Article_ID: savedKB.KB_Article_ID
      });
    }

    return res.json({
      mode: "bulk_learning",
      summary,
      results
    });
  });

  return router;
}
