export interface ShortNote {
    id: string;
    title: string;
    keyPoints: string[];  // Bullet points of key information
    summary: string;      // Brief 2-3 sentence summary
    formula?: string;     // Optional formula/equation in LaTeX
    example?: string;     // Optional quick example
    tags?: string[];
}

export interface ShortNotesSet {
    id: string;
    topicName: string;
    createdAt: string;
    notes: ShortNote[];
    totalNotes: number;
}
