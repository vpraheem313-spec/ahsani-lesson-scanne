export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface MCQQuestion {
  id: string;
  questionNumber: number;
  question: string;
  options: [string, string, string, string]; // exactly 4 choices
  correctAnswer: number; // 0, 1, 2, or 3
  difficulty: Difficulty;
  explanation?: string;
}

export interface Lesson {
  id: string;
  title: string;
  createdAt: number;
  imageDataUrl: string; // First page or main thumbnail
  pageImages: string[]; // Array of up to 5 page images [Page 1, Page 2, ...]
  extractedText: string;
  questions: MCQQuestion[];
  languageDetected?: string;
}

export interface ProcessLessonResponse {
  extractedText: string;
  languageDetected: string;
  titleSuggestion: string;
  questions: MCQQuestion[];
  error?: string;
}
