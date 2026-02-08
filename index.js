import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { loadDataset } from "./loaders/loadDataset.js";
import analyzeRoute from "./routes/analyze.js";

dotenv.config();

console.log("ENV CHECK:", {
  keyExists: !!process.env.OPENAI_API_KEY,
  keyLength: process.env.OPENAI_API_KEY?.length,
});

const app = express();
app.use(cors());
app.use(express.json());

const dataset = loadDataset();

app.use("/api", analyzeRoute(dataset));

const PORT = process.env.PORT || 5100;
app.listen(PORT, () => {
  console.log(`SupportMind AI running on port ${PORT}`);
});