import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const EMBEDDING_DIMENSION = 768; // text-embedding-004 default dimension
const MAX_BATCH_SIZE = 100; // Adjust based on API limits
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export class GeminiEmbeddingService {
  private genAI: GoogleGenerativeAI;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || "";
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not set in .env");
    }
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      batches.push(texts.slice(i, i + MAX_BATCH_SIZE));
    }

    const allEmbeddings: number[][] = [];

    for (const batch of batches) {
      const batchEmbeddings = await this.generateBatchWithRetry(batch);
      allEmbeddings.push(...batchEmbeddings);
    }

    // Validate all embeddings
    for (const embedding of allEmbeddings) {
      this.validateEmbedding(embedding);
    }

    return allEmbeddings;
  }

  /**
   * Generate embedding for a single query text
   */
  async embedQuery(text: string): Promise<number[]> {
    const embeddings = await this.generateEmbeddings([text]);
    if (embeddings.length === 0) {
      throw new Error("Failed to generate query embedding");
    }
    return embeddings[0];
  }

  private async generateBatchWithRetry(
    texts: string[],
    retryCount: number = 0
  ): Promise<number[][]> {
    try {
      return await this.generateBatch(texts);
    } catch (error: any) {
      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        console.log(
          `Embedding batch failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
        );
        await this.sleep(delay);
        return await this.generateBatchWithRetry(texts, retryCount + 1);
      } else {
        throw new Error(
          `Failed to generate embeddings after ${MAX_RETRIES} retries: ${error.message}`
        );
      }
    }
  }

  private async generateBatch(texts: string[]): Promise<number[][]> {
    // Use the Gemini embedding API via REST
    // Note: The Google Generative AI SDK doesn't have direct embedding support
    // So we use the REST API with axios
    
    try {
      // Process texts one by one (Gemini embedding API doesn't support batch)
      const embeddings: number[][] = [];
      
      for (const text of texts) {
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.apiKey}`,
          {
            model: "models/text-embedding-004",
            content: { parts: [{ text }] },
            taskType: "RETRIEVAL_DOCUMENT",
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = response.data;
        // Handle response format
        const values = data.embedding?.values || [];
        if (values.length !== EMBEDDING_DIMENSION) {
          throw new Error(
            `Unexpected embedding dimension: expected ${EMBEDDING_DIMENSION}, got ${values.length}`
          );
        }
        embeddings.push(values);
      }
      
      return embeddings;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        throw new Error(`Gemini API error: ${errorMsg}`);
      }
      throw error;
    }
  }


  private validateEmbedding(embedding: number[]): void {
    if (embedding.length !== EMBEDDING_DIMENSION) {
      throw new Error(
        `Invalid embedding dimension: expected ${EMBEDDING_DIMENSION}, got ${embedding.length}`
      );
    }

    for (const value of embedding) {
      if (!isFinite(value)) {
        throw new Error(`Invalid embedding value: ${value} is not finite`);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get the embedding dimension
   */
  static getDimension(): number {
    return EMBEDDING_DIMENSION;
  }
}

