import fs from "fs-extra";
import path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { OCRTool } from "./ocr";
import { Page } from "../utils/chunking";

const MAX_PAGES = 200;

export interface ExtractedDocument {
  text: string;
  pages: Page[];
  pageCount: number;
}

export class DocumentProcessor {
  private ocrTool: OCRTool;

  constructor() {
    this.ocrTool = new OCRTool();
  }

  /**
   * Count pages in a document
   */
  async countPages(filePath: string, fileType: string): Promise<number> {
    switch (fileType.toLowerCase()) {
      case ".pdf":
        return await this.countPdfPages(filePath);
      case ".docx":
        return await this.countDocxPages(filePath);
      case ".txt":
      case ".md":
        return 1; // Treated as single page
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * Extract text from a document
   */
  async extractText(filePath: string, fileType: string): Promise<ExtractedDocument> {
    switch (fileType.toLowerCase()) {
      case ".pdf":
        return await this.extractPdfText(filePath);
      case ".docx":
        return await this.extractDocxText(filePath);
      case ".txt":
        return await this.extractTextFile(filePath);
      case ".md":
        return await this.extractMarkdownFile(filePath);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * Check if file exceeds page limit
   */
  async checkPageLimit(filePath: string, fileType: string): Promise<void> {
    const pageCount = await this.countPages(filePath, fileType);
    if (pageCount > MAX_PAGES) {
      throw new Error(
        `Document ${filePath} exceeds maximum page limit of ${MAX_PAGES} pages (found ${pageCount} pages)`
      );
    }
  }

  private async countPdfPages(filePath: string): Promise<number> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.numpages;
    } catch (error: any) {
      throw new Error(`Failed to count PDF pages: ${error.message}`);
    }
  }

  private async countDocxPages(filePath: string): Promise<number> {
    try {
      // DOCX doesn't have a reliable page count without rendering
      // We'll estimate based on character count: ~2000 chars per page
      const result = await mammoth.extractRawText({ path: filePath });
      const charCount = result.value.length;
      return Math.max(1, Math.ceil(charCount / 2000));
    } catch (error: any) {
      throw new Error(`Failed to count DOCX pages: ${error.message}`);
    }
  }

  private async extractPdfText(filePath: string): Promise<ExtractedDocument> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);

      // Check if PDF has extractable text
      const hasText = pdfData.text && pdfData.text.trim().length > 0;

      if (hasText) {
        // Text-based PDF: split by pages
        const pages: Page[] = [];
        // pdf-parse doesn't provide per-page text directly, so we'll split the text
        // This is approximate but works for most cases
        const fullText = pdfData.text;
        const estimatedCharsPerPage = fullText.length / pdfData.numpages;
        
        for (let i = 0; i < pdfData.numpages; i++) {
          const start = Math.floor(i * estimatedCharsPerPage);
          const end = Math.floor((i + 1) * estimatedCharsPerPage);
          const pageText = fullText.slice(start, end).trim();
          
          pages.push({
            pageNumber: i + 1,
            text: pageText,
            requiresOcr: false,
          });
        }

        return {
          text: fullText,
          pages,
          pageCount: pdfData.numpages,
        };
      } else {
        // Scanned PDF: use OCR
        console.log(`PDF appears to be scanned, using OCR for ${filePath}`);
        const ocrText = await this.ocrTool.run(filePath);
        
        // Split OCR text into pages (approximate)
        const lines = ocrText.split("\n");
        const linesPerPage = Math.max(1, Math.floor(lines.length / pdfData.numpages));
        const pages: Page[] = [];

        for (let i = 0; i < pdfData.numpages; i++) {
          const start = i * linesPerPage;
          const end = (i + 1) * linesPerPage;
          const pageText = lines.slice(start, end).join("\n").trim();

          pages.push({
            pageNumber: i + 1,
            text: pageText,
            requiresOcr: true,
          });
        }

        return {
          text: ocrText,
          pages,
          pageCount: pdfData.numpages,
        };
      }
    } catch (error: any) {
      throw new Error(`Failed to extract PDF text: ${error.message}`);
    }
  }

  private async extractDocxText(filePath: string): Promise<ExtractedDocument> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const text = result.value;
      
      // Estimate pages based on character count
      const estimatedPageCount = Math.max(1, Math.ceil(text.length / 2000));
      
      // Split into paragraphs and assign to synthetic pages
      const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
      const paragraphsPerPage = Math.max(1, Math.ceil(paragraphs.length / estimatedPageCount));
      
      const pages: Page[] = [];
      for (let i = 0; i < estimatedPageCount; i++) {
        const start = i * paragraphsPerPage;
        const end = Math.min((i + 1) * paragraphsPerPage, paragraphs.length);
        const pageText = paragraphs.slice(start, end).join("\n\n").trim();

        pages.push({
          pageNumber: i + 1,
          text: pageText,
          requiresOcr: false,
        });
      }

      return {
        text,
        pages,
        pageCount: estimatedPageCount,
      };
    } catch (error: any) {
      throw new Error(`Failed to extract DOCX text: ${error.message}`);
    }
  }

  private async extractTextFile(filePath: string): Promise<ExtractedDocument> {
    try {
      const text = await fs.readFile(filePath, "utf-8");
      const pages: Page[] = [
        {
          pageNumber: 1,
          text,
          requiresOcr: false,
        },
      ];

      return {
        text,
        pages,
        pageCount: 1,
      };
    } catch (error: any) {
      throw new Error(`Failed to extract text file: ${error.message}`);
    }
  }

  private async extractMarkdownFile(filePath: string): Promise<ExtractedDocument> {
    try {
      const text = await fs.readFile(filePath, "utf-8");
      
      // Split by headings for better chunking
      const pages: Page[] = [
        {
          pageNumber: 1,
          text,
          requiresOcr: false,
        },
      ];

      return {
        text,
        pages,
        pageCount: 1,
      };
    } catch (error: any) {
      throw new Error(`Failed to extract markdown file: ${error.message}`);
    }
  }

  /**
   * Get supported file extensions
   */
  static getSupportedExtensions(): string[] {
    return [".pdf", ".docx", ".txt", ".md"];
  }

  /**
   * Check if file type is supported
   */
  static isSupported(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return DocumentProcessor.getSupportedExtensions().includes(ext);
  }
}

