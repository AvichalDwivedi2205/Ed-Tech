"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizViewerProps {
  questions: QuizQuestion[];
  title?: string;
}

export function QuizViewer({ questions, title }: QuizViewerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-600 dark:text-slate-400">No questions available</p>
        </CardContent>
      </Card>
    );
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResults) return;
    
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setShowResults(false);
    }
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        correct++;
      }
    });
    return { correct, total: questions.length, percentage: Math.round((correct / questions.length) * 100) };
  };

  const question = questions[currentQuestion];
  const selectedAnswer = selectedAnswers[currentQuestion];
  const isCorrect = selectedAnswer !== undefined && selectedAnswer === question.correctAnswer;

  if (showResults && currentQuestion === questions.length - 1) {
    const score = calculateScore();
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Quiz Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="mb-4 text-6xl font-bold text-blue-600 dark:text-blue-400">
              {score.percentage}%
            </div>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              You got {score.correct} out of {score.total} questions correct
            </p>
          </div>
          <div className="space-y-4">
            {questions.map((q, index) => {
              const userAnswer = selectedAnswers[index];
              const isQCorrect = userAnswer === q.correctAnswer;
              return (
                <Card key={index} className={isQCorrect ? "border-green-500" : "border-red-500"}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {isQCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold mb-2">{q.question}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Your answer: {q.options[userAnswer]}
                        </p>
                        {!isQCorrect && (
                          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                            Correct answer: {q.options[q.correctAnswer]}
                          </p>
                        )}
                        {q.explanation && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 italic">
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Button onClick={() => { setShowResults(false); setCurrentQuestion(0); setSelectedAnswers([]); }} className="w-full">
            Retake Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title || `Question ${currentQuestion + 1} of ${questions.length}`}</CardTitle>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {currentQuestion + 1} / {questions.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">
            {question.question}
          </p>
          <div className="space-y-2">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const showCorrect = showResults && index === question.correctAnswer;
              const showIncorrect = showResults && isSelected && index !== question.correctAnswer;
              
              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showResults}
                  className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  } ${
                    showCorrect
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : ""
                  } ${
                    showIncorrect
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : ""
                  } disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                        isSelected
                          ? "border-blue-600 bg-blue-600"
                          : "border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      {isSelected && (
                        <div className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="text-slate-900 dark:text-slate-100">{option}</span>
                    {showCorrect && (
                      <CheckCircle2 className="ml-auto h-5 w-5 text-green-500" />
                    )}
                    {showIncorrect && (
                      <XCircle className="ml-auto h-5 w-5 text-red-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {question.explanation && showResults && (
          <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
              Explanation:
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {question.explanation}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>
          {currentQuestion === questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={selectedAnswer === undefined}>
              Submit Quiz
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={selectedAnswer === undefined}>
              Next
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

