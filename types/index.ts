export interface Question {
  id: number;
  type: 'multiple' | 'single' | 'judge' | 'indefinite';
  question: string;
  options: string[];
  answer: string[];
  attempted?: boolean; // 是否已经做过这道题
  isCorrect?: boolean; // 最后一次答题是否正确
}

export interface UserProgress {
  currentQuestionIndex: number;
  correctCount: number;
  incorrectCount: number;
  wrongQuestions: number[];
  completedQuestions: number[];
}

export interface ExamResult {
  id: string;
  date: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  questions: Question[];
  userAnswers: { [questionId: number]: string[] };
}

export interface ExamHistory {
  results: ExamResult[];
}
