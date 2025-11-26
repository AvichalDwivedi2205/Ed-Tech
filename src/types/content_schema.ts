export interface AgentResponse {
    id: string;
    title: string;
    createdAt: string;
    markdown: string;
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
