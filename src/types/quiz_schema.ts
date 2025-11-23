export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type QuestionType = 'MCQ' | 'ShortAnswer' | 'LongAnswer';

export interface Question {
    id: string;
    type: QuestionType;
    difficulty: Difficulty;
    question: string;
    options?: string[]; // Only for MCQ
    correctAnswer: string; // For MCQ (the option text) or Model Answer for others
    explanation: string; // Detailed explanation of the answer
    source?: string; // "Generated" or URL if found online
    tags?: string[]; // e.g., ["concept", "calculation"]
}

export interface Quiz {
    id: string;
    topicName: string;
    createdAt: string;
    questions: Question[];
}
