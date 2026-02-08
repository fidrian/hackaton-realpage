import fs from "fs";
import path from "path";
import mammoth from "mammoth";

const docxPath = path.resolve(process.cwd(), "data", "5. RealPage_ SupportMind AI - Build the Self-Learning Brain for Customer Support.docx");
const outPath = path.resolve(process.cwd(), "data", "docx_extracted.txt");

async function extract() {
  try {
    const result = await mammoth.extractRawText({ path: docxPath });
    const text = result.value;
    fs.writeFileSync(outPath, text, "utf8");
    console.log("Extracted text saved to:", outPath);
    console.log("--- START OF EXTRACT ---\n", text.slice(0, 2000));
  } catch (err) {
    console.error("Failed to extract DOCX:", err);
    process.exit(1);
  }
}

extract();
