import express from "express";
import { triageIssue } from "../services/triageService.js";
import { generateKnowledgeArticle } from "../services/kbGenerator.js";
import { findRelevantKB } from "../services/ragService.js";
import { saveGeneratedKB } from "../services/learningService.js";

const router = express.Router();

export default function analyzeRoute(dataset) {
  router.post("/analyze", async (req, res) => {
    try {
      const { conversationId } = req.body;

      const convo = dataset.Conversations.find(
        c => String(c.Conversation_ID) === String(conversationId)
      );

      if (!convo) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const ticket = dataset.Tickets.find(
        t => t.Ticket_Number === convo.Ticket_Number
      );

      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const kbCandidate = findRelevantKB(
        dataset.KnowledgeArticles,
        convo.Transcript
      );

      const triage = await triageIssue({
        transcript: convo.Transcript,
        ticket,
        kbCandidate
      });

      // generate a KB draft (we may or may not persist it depending on triage)
      const kbDraft = await generateKnowledgeArticle({
        transcript: convo.Transcript,
        ticket
      });

      let savedKB = null;
      // decide whether to persist the KB based on triage result
      try {
        const triageText = JSON.stringify(triage).toUpperCase();
        const shouldSave = triageText.includes("KNOWLEDGE") || triageText.includes("ARTICLE");
        if (shouldSave) {
          savedKB = await saveGeneratedKB(kbDraft, {
            ticketNumber: ticket.Ticket_Number,
            conversationId: convo.Conversation_ID,
            source: "triage_auto"
          });
        }
      } catch (err) {
        console.warn("Failed to auto-save generated KB:", err.message);
      }

      res.json({
        decision: triage,
        generated_kb: kbDraft,
        saved_kb: savedKB,
        traceability: {
          Ticket_Number: ticket.Ticket_Number,
          Conversation_ID: convo.Conversation_ID,
          Existing_KB: ticket.KB_Article_ID || null
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  return router;
}
