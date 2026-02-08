import fs from "fs/promises";
import path from "path";

const GENERATED_DIR = path.resolve(process.cwd(), "data", "generated_kb");
const LINEAGE_FILE = path.resolve(process.cwd(), "data", "kb_lineage.json");

async function ensureDir() {
  try {
    await fs.mkdir(GENERATED_DIR, { recursive: true });
  } catch (err) {
    // ignore
  }
}

function makeId() {
  const t = Date.now();
  const r = Math.random().toString(36).slice(2, 8);
  return `KB_${t}_${r}`;
}

export async function saveGeneratedKB(kbObject, { ticketNumber, conversationId, source = "auto" } = {}) {
  await ensureDir();
  const id = makeId();
  const doc = {
    KB_Article_ID: id,
    Title: kbObject.Title || kbObject.title || `Generated KB ${id}`,
    ProblemSummary: kbObject["Problem Summary"] || kbObject.problemSummary || kbObject.Summary || "",
    ResolutionSteps: kbObject["Resolution Steps"] || kbObject.resolutionSteps || kbObject.Resolution || "",
    Preconditions: kbObject.Preconditions || kbObject.preconditions || "",
    Source_Ticket_Number: ticketNumber || null,
    Source_Conversation_ID: conversationId || null,
    Source: source,
    GeneratedAt: new Date().toISOString(),
    raw: kbObject
  };

  const outPath = path.join(GENERATED_DIR, `${id}.json`);
  await fs.writeFile(outPath, JSON.stringify(doc, null, 2), "utf8");

  // append lineage
  let lineage = [];
  try {
    const existing = await fs.readFile(LINEAGE_FILE, "utf8");
    lineage = JSON.parse(existing || "[]");
  } catch (err) {
    lineage = [];
  }

  lineage.push({
    KB_Article_ID: id,
    Source_Ticket_Number: ticketNumber || null,
    Source_Conversation_ID: conversationId || null,
    CreatedAt: new Date().toISOString()
  });

  await fs.writeFile(LINEAGE_FILE, JSON.stringify(lineage, null, 2), "utf8");

  return doc;
}

export async function listGeneratedKB() {
  await ensureDir();
  const files = await fs.readdir(GENERATED_DIR);
  const items = [];
  for (const f of files) {
    if (f.endsWith('.json')) {
      const content = await fs.readFile(path.join(GENERATED_DIR, f), 'utf8');
      items.push(JSON.parse(content));
    }
  }
  return items;
}
