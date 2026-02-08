import fs from "fs/promises";
import path from "path";

const GENERATED_DIR = path.resolve(process.cwd(), "data", "generated_kb");
const LINEAGE_FILE = path.resolve(process.cwd(), "data", "kb_lineage.json");

async function ensureDir() {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
}

function makeId() {
  return `KB_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveGeneratedKB(
  kbObject,
  { ticketNumber, conversationId, source = "auto" } = {}
) {
  await ensureDir();

  const id = makeId();
  const doc = {
    KB_Article_ID: id,
    Title:
      kbObject.Title ||
      kbObject.title ||
      "Generated Knowledge Article",
    ProblemSummary:
      kbObject.ProblemSummary ||
      kbObject["Problem Summary"] ||
      "",
    ResolutionSteps:
      kbObject.ResolutionSteps ||
      kbObject["Resolution Steps"] ||
      kbObject.Resolution ||
      "",
    Preconditions:
      kbObject.Preconditions || "",
    Source_Ticket_Number: ticketNumber || null,
    Source_Conversation_ID: conversationId || null,
    Source: source,
    GeneratedAt: new Date().toISOString(),
    raw: kbObject
  };

  await fs.writeFile(
    path.join(GENERATED_DIR, `${id}.json`),
    JSON.stringify(doc, null, 2),
    "utf8"
  );

  // lineage
  let lineage = [];
  try {
    lineage = JSON.parse(await fs.readFile(LINEAGE_FILE, "utf8"));
  } catch {
    lineage = [];
  }

  lineage.push({
    KB_Article_ID: id,
    Source_Ticket_Number: ticketNumber,
    Source_Conversation_ID: conversationId,
    CreatedAt: new Date().toISOString()
  });

  await fs.writeFile(
    LINEAGE_FILE,
    JSON.stringify(lineage, null, 2),
    "utf8"
  );

  return doc;
}

export async function listGeneratedKB() {
  await ensureDir();
  const files = await fs.readdir(GENERATED_DIR);
  const items = [];

  for (const f of files) {
    if (f.endsWith(".json")) {
      const content = await fs.readFile(
        path.join(GENERATED_DIR, f),
        "utf8"
      );
      items.push(JSON.parse(content));
    }
  }
  return items;
}
