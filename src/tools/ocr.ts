import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

export class OCRTool {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error("GOOGLE_API_KEY is not set in .env");
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    async run(filePath: string): Promise<string> {
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        const mimeType = this.getMimeType(filePath);
        const fileData = await fs.readFile(filePath);
        return this.runFromBuffer(fileData, mimeType);
    }

    async runFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
        const imageParts = [
            {
                inlineData: {
                    data: buffer.toString("base64"),
                    mimeType: mimeType,
                },
            },
        ];

        const prompt =
            "Extract all text from this image/document. Return only the extracted text without any additional commentary. Preserve the original structure, headings, bullet points, and numbering where applicable.";

        try {
            const result = await this.model.generateContent([prompt, ...imageParts]);
            const response = await result.response;
            return response.text();
        } catch (error: any) {
            throw new Error(`OCR failed: ${error.message}`);
        }
    }

    private getMimeType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        return this.getMimeTypeFromExtension(ext);
    }

    getMimeTypeFromExtension(ext: string): string {
        switch (ext.toLowerCase()) {
            case ".png":
                return "image/png";
            case ".jpg":
            case ".jpeg":
                return "image/jpeg";
            case ".webp":
                return "image/webp";
            case ".heic":
                return "image/heic";
            case ".heif":
                return "image/heif";
            case ".pdf":
                return "application/pdf";
            default:
                throw new Error(`Unsupported file type: ${ext}`);
        }
    }
}
