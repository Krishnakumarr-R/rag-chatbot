"use server";

import pdf from "pdf-parse";
import { db } from "@/lib/db-config";
import { documents } from "@/lib/db-schema";
import { generateEmbeddings } from "@/lib/embeddings";
import { chunkContent } from "@/lib/chunking";

const BATCH_SIZE = 50;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function processPdfFile(formData: FormData) {
  try {
    const file = formData.get("pdf");
    if (!file || !(file instanceof File)) {
      return { success: false, error: "No file provided" };
    }
    if (file.type !== "application/pdf") {
      return { success: false, error: "File must be a PDF" };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: "File exceeds 10MB limit" };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const data = await pdf(buffer);

    if (!data.text?.trim()) {
      return { success: false, error: "No text found in PDF" };
    }

    const chunks = await chunkContent(data.text);

    const embeddings: number[][] = [];
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const batchEmbeddings = await generateEmbeddings(batch);
      embeddings.push(...batchEmbeddings);
    }

    if (chunks.length !== embeddings.length) {
      throw new Error("Chunk/embedding count mismatch");
    }

    const records = chunks.map((chunk, index) => ({
      content: chunk,
      embedding: embeddings[index],
    }));

    await db.insert(documents).values(records);

    return {
      success: true,
      message: `Created ${records.length} searchable chunks`,
    };
  } catch (error) {
    console.error("PDF processing error:", error);
    return { success: false, error: "Failed to process PDF" };
  }
}