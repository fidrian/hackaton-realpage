import xlsx from "xlsx";
import path from "path";

const filePath = path.join("data", "SupportMind__Final_Data.xlsx");

export function loadDataset() {
  const workbook = xlsx.readFile(filePath);

  const Conversations = xlsx.utils.sheet_to_json(
    workbook.Sheets["Conversations"]
  );

  const Tickets = xlsx.utils.sheet_to_json(
    workbook.Sheets["Tickets"]
  );

  const KnowledgeArticles = xlsx.utils.sheet_to_json(
    workbook.Sheets["Knowledge_Articles"]
  );

  return {
    Conversations,
    Tickets,
    KnowledgeArticles
  };
}