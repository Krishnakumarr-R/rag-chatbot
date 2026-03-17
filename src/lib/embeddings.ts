import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey:
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});
const MODEL = "gemini-embedding-001";
const DIMENSIONS = 768;

function normalizeEmbedding(values?: number[]): number[] {
  const list = values ?? [];
  if (list.length === DIMENSIONS) return list;
  if (list.length > DIMENSIONS) return list.slice(0, DIMENSIONS);
  return [...list, ...new Array(DIMENSIONS - list.length).fill(0)];
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: MODEL,
    contents: text.replaceAll("\n", " "),
  });

  const embedding = response.embeddings?.[0]?.values;
  return normalizeEmbedding(embedding);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await ai.models.embedContent({
    model: MODEL,
    contents: texts.map((t) => t.replaceAll("\n", " ")),
  });

  const embeddings = response.embeddings ?? [];
  return texts.map((_, idx) => normalizeEmbedding(embeddings[idx]?.values));
}