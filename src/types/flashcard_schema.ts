export interface Flashcard {
    id: string;
    front: string; // The question or term
    back: string;  // The answer or definition
    tags?: string[]; // Optional tags for categorization
}

export interface FlashcardSet {
    id: string;
    topicName: string;
    createdAt: string;
    cards: Flashcard[];
}
