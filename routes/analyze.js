import express from "express";

// core services
import { triageIssue } from "../services/triageService.js";
import { generateKnowledgeArticle } from "../services/kbGenerator.js";
import {
  saveGeneratedKB
} from "../services/learningService.js";
import { suggestForAgent } from "../services/copilotService.js";
import { findRelevantKB } from "../services/ragService.js";

const router = express.Router();

export default function analyzeRoute(dataset) {
  /**
   * POST /api/analyze
   * Body: { conversationId: string }
   */
  router.post("/analyze", async (req, res) => {
    const { conversationId } = req.body;

    try {
      // =========================
      // 1. Find Conversation
      // =========================
      const convo = dataset.Conversations.find(
        c =>
          String(c.Conversation_ID).trim() ===
          String(conversationId).trim()
      );

      if (!convo) {
        return res.status(404).json({
          error: "Conversation not found"
        });
      }

      // =========================
      // 2. Find Ticket
      // =========================
      const ticket = dataset.Tickets.find(
        t => t.Ticket_Number === convo.Ticket_Number
      );

      if (!ticket) {
        return res.status(404).json({
          error: "Ticket not found"
        });
      }

      // =========================
      // 3. Triage Decision
      // =========================
      const kbCandidate = findRelevantKB(
        dataset.KnowledgeArticles || [],
        convo.Transcript || ""
      );

      let triage;
      let kbDraft;
      let demoFallback = false;

      try {
        triage = await triageIssue({
          transcript: convo.Transcript,
          ticket,
          kbCandidate
        });
        console.log("STEP 2: GENERATE KB");
        kbDraft = await generateKnowledgeArticle({
          transcript: convo.Transcript,
          ticket
        });
      } catch (openaiErr) {
        console.warn("OpenAI failed, using demo fallback:", openaiErr.message);
        demoFallback = true;
        triage = {
          decision: "KNOWLEDGE_ARTICLE",
          reasoning: "Demo mode: OpenAI unavailable (quota/rate limit). Using mock response."
        };
        const summary = convo.Issue_Summary || ticket.Issue_Summary || "Support case";
        kbDraft = {
          Title: (summary && String(summary).slice(0, 80)) || "Generated from case",
          "Problem Summary": summary || "",
          "Resolution Steps": ticket.Resolution || "See ticket resolution.",
          Preconditions: "",
          Source_Ticket_Number: ticket.Ticket_Number
        };
      }

      // =========================
      // 5. Save Knowledge + Lineage
      // =========================
      const savedKB = await saveGeneratedKB(kbDraft, {
        ticketNumber: ticket.Ticket_Number,
        conversationId: convo.Conversation_ID,
        source: demoFallback ? "demo_fallback" : "auto"
      });

      // =========================
      // 6. Copilot Suggestions
      // =========================
      const copilotResults = await suggestForAgent(
        convo.Transcript,
        dataset
      );

      // =========================
      // 7. Final Response
      // =========================
      return res.json({
        decision: triage,

        learning_result: {
          generated_kb_id: savedKB.KB_Article_ID,
          generated_kb_title: savedKB.Title,
          source_ticket: ticket.Ticket_Number
        },

        copilot_ready_output: {
          suggestions: copilotResults.map(kb => ({
            id: kb.KB_Article_ID || null,
            title: kb.Title,
            source: kb.source || "generated",
            relevanceScore: kb.relevanceScore || 1.0
          }))
        },

        traceability: {
          Conversation_ID: convo.Conversation_ID,
          Ticket_Number: ticket.Ticket_Number
        },

        dataset_coverage: {
          Conversations: true,
          Tickets: true,
          Knowledge_Articles: true,
          Scripts_Master: dataset.ScriptsMaster.length > 0,
          KB_Lineage: true,
          Questions: false // intentionally not used in runtime
        },

        knowledge_provenance: {
          source_ticket: ticket.Ticket_Number,
          source_conversation: convo.Conversation_ID,
          lineage_written: true
        }
      });

    } catch (err) {
      console.error("ANALYSIS ERROR:", err);

      return res.status(500).json({
        error: "Analysis failed",
        detail: err.message
      });
    }
  });

  router.post("/copilot/suggest", async (req, res) => {
    try {
      const { query } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required and must be a string" });
      }

      const suggestions = await suggestForAgent(query, dataset);

      res.json({
        query,
        suggestions: suggestions.map(kb => ({
          KB_Article_ID: kb.KB_Article_ID,
          Title: kb.Title || kb.title,
          Summary: kb.ProblemSummary || kb.problemSummary || kb.Summary,
          ResolutionSteps: kb.ResolutionSteps || kb.resolutionSteps || kb.Resolution,
          Source: kb.source || "unknown",
          Relevance: Math.round((kb.relevanceScore || 0) * 100)
        }))
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Copilot suggestion failed" });
    }
  });

  return router;
}
