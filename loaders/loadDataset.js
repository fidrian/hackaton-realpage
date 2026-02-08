import xlsx from "xlsx";
import path from "path";

const filePath = path.join("data", "SupportMind__Final_Data.xlsx");

function safeSheet(workbook, name) {
  const sheet = workbook.Sheets[name];
  if (!sheet) return [];
  return xlsx.utils.sheet_to_json(sheet);
}

export function loadDataset() {
  const workbook = xlsx.readFile(filePath);

  return {
    Conversations: safeSheet(workbook, "Conversations"),
    Tickets: safeSheet(workbook, "Tickets"),
    KnowledgeArticles: safeSheet(workbook, "Knowledge_Articles"),
    ScriptsMaster: safeSheet(workbook, "Scripts_Master"),
    KBLineageSeed: safeSheet(workbook, "KB_Lineage")
  };
}
