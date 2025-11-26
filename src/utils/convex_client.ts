import { ConvexHttpClient } from "convex/browser";
import dotenv from "dotenv";

dotenv.config();

let convexClient: ConvexHttpClient | null = null;

/**
 * Get or create Convex client singleton
 */
export function getConvexClient(): ConvexHttpClient {
  if (!convexClient) {
    const convexUrl = process.env.CONVEX_URL;
    if (!convexUrl) {
      throw new Error("CONVEX_URL is not set in .env");
    }
    convexClient = new ConvexHttpClient(convexUrl);
  }
  return convexClient;
}

/**
 * Get workspace ID from environment or use default
 */
export function getWorkspaceId(): string {
  return process.env.WORKSPACE_ID || "default";
}

