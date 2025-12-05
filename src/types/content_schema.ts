// Slide types for lecture-style content
export type SlideType = "theory" | "example" | "question" | "exercise" | "summary";

export interface SlideContent {
    pageNumber: number;
    type: SlideType;
    title: string;
    content: string;  // Markdown content for the slide
    notes?: string;   // Optional presenter notes or additional context
}

export interface AgentResponse {
    id: string;
    title: string;         // The actual topic name from roadmap
    subtopicId: string;    // The subtopic identifier (e.g., "Subtopic1")
    createdAt: string;
    markdown: string;      // Legacy: full markdown (kept for backwards compatibility)
    slides: SlideContent[]; // New: array of slides for paginated view
    totalSlides: number;
}

export interface ContentGenerationSettings {
    useRag: boolean;
    useWebSearch: boolean;
    ragNamespace: string;
    workspaceId: string;
}

export interface DocumentMetadata {
    title: string;
    sourcePath: string;
    pageCount: number;
    ragNamespace: string;
    status: "pending" | "indexed" | "skipped_page_limit" | "failed";
    hash: string;
    createdAt?: number;
    updatedAt?: number;
}

export interface ChunkMetadata {
    docId: string;
    chunkIndex: number;
    pageStart: number;
    pageEnd: number;
    requiresOcr?: boolean;
    [key: string]: any;
}

// Legacy types might be removed or kept if needed for migration, 
// but for now we replace them to focus on the new contract.
