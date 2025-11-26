/**
 * Chunking utilities for text processing
 */

export interface Page {
  pageNumber: number;
  text: string;
  requiresOcr?: boolean;
}

export interface Chunk {
  text: string;
  pageStart: number;
  pageEnd: number;
  chunkIndex: number;
  tokenEstimate: number;
}

/**
 * Estimate token count (approximate: ~4 characters per token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into sentences (simple approach)
 */
export function splitIntoSentences(text: string): string[] {
  // Split by sentence-ending punctuation followed by space or newline
  return text
    .split(/([.!?]\s+|[.!?]\n+)/)
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim());
}

/**
 * Split text into paragraphs
 */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Chunk pages into semantic chunks with overlap
 * @param pages Array of pages with text
 * @param targetTokens Target tokens per chunk (400-800)
 * @param overlapTokens Overlap tokens between chunks (80-120)
 * @returns Array of chunks with metadata
 */
export function chunkText(
  pages: Page[],
  targetTokens: number = 600,
  overlapTokens: number = 100
): Chunk[] {
  const chunks: Chunk[] = [];
  let currentChunk = "";
  let currentPageStart = pages.length > 0 ? pages[0].pageNumber : 1;
  let currentPageEnd = currentPageStart;
  let chunkIndex = 0;
  let overlapBuffer = "";

  for (const page of pages) {
    const pageText = page.text;
    const sentences = splitIntoSentences(pageText);

    for (const sentence of sentences) {
      const sentenceTokens = estimateTokens(sentence);
      const currentTokens = estimateTokens(currentChunk);
      const overlapBufferTokens = estimateTokens(overlapBuffer);

      // If adding this sentence would exceed target, finalize current chunk
      if (currentTokens + sentenceTokens > targetTokens && currentChunk.length > 0) {
        // Save overlap for next chunk
        const sentencesInChunk = splitIntoSentences(currentChunk);
        const overlapSentences: string[] = [];
        let overlapTokenCount = 0;

        // Take last sentences that fit in overlap window
        for (let i = sentencesInChunk.length - 1; i >= 0; i--) {
          const sent = sentencesInChunk[i];
          const sentTokens = estimateTokens(sent);
          if (overlapTokenCount + sentTokens <= overlapTokens) {
            overlapSentences.unshift(sent);
            overlapTokenCount += sentTokens;
          } else {
            break;
          }
        }

        overlapBuffer = overlapSentences.join(" ");

        // Create chunk
        chunks.push({
          text: currentChunk,
          pageStart: currentPageStart,
          pageEnd: currentPageEnd,
          chunkIndex: chunkIndex++,
          tokenEstimate: currentTokens,
        });

        // Start new chunk with overlap
        currentChunk = overlapBuffer + " " + sentence;
        currentPageStart = currentPageEnd; // Start from where previous chunk ended
        currentPageEnd = page.pageNumber;
      } else {
        // Add sentence to current chunk
        if (currentChunk.length > 0) {
          currentChunk += " " + sentence;
        } else {
          currentChunk = sentence;
        }
        currentPageEnd = page.pageNumber;
      }
    }
  }

  // Add final chunk if there's remaining text
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      pageStart: currentPageStart,
      pageEnd: currentPageEnd,
      chunkIndex: chunkIndex,
      tokenEstimate: estimateTokens(currentChunk),
    });
  }

  return chunks;
}

