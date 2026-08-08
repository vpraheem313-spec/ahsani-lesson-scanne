import React, { useState } from 'react';
import { Lesson, MCQQuestion, Difficulty } from '../types';
import { ArrowLeft, CheckCircle2, HelpCircle, Eye, EyeOff, BookOpen, Layers, Award, Sparkles } from 'lucide-react';

interface QuestionViewerProps {
  lesson: Lesson;
  onBack: () => void;
}

export const QuestionViewer: React.FC<QuestionViewerProps> = ({ lesson, onBack }) => {
  const [filterDifficulty, setFilterDifficulty] = useState<'All' | Difficulty>('All');
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [showAnswers, setShowAnswers] = useState<boolean>(true);

  const questions = lesson.questions || [];

  const easyCount = questions.filter((q) => q.difficulty === 'Easy').length;
  const mediumCount = questions.filter((q) => q.difficulty === 'Medium').length;
  const hardCount = questions.filter((q) => q.difficulty === 'Hard').length;
  const totalCount = questions.length;

  const filteredQuestions = filterDifficulty === 'All'
    ? questions
    : questions.filter((q) => q.difficulty === filterDifficulty);

  const handleSelectOption = (questionNumber: number, optionIdx: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionNumber]: optionIdx,
    }));
  };

  const getDifficultyBadge = (diff: Difficulty) => {
    switch (diff) {
      case 'Easy':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
            Easy (എളുപ്പം)
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
            Medium (ഇടത്തരം)
          </span>
        );
      case 'Hard':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
            Hard (കാഠിന്യമുള്ളത്)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Lesson</span>
        </button>

        <button
          onClick={() => setShowAnswers(!showAnswers)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            showAnswers
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-slate-100 text-slate-700 border-slate-300'
          }`}
        >
          {showAnswers ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4" />}
          <span>{showAnswers ? 'Hide Answers' : 'Show Correct Answers'}</span>
        </button>
      </div>

      {/* Lesson Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            Generated Questions
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            {lesson.title || 'Lesson MCQs'}
          </h2>
          <p className="text-xs text-slate-500">
            Questions generated strictly from scanned lesson page content. Suitable for Madrasa students.
          </p>
        </div>

        {/* REQUIRED STATS BADGES DISPLAY */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Easy</span>
            <span className="text-xl font-black text-emerald-900">{easyCount}</span>
            <span className="text-[10px] text-emerald-600 block">Questions</span>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Medium</span>
            <span className="text-xl font-black text-amber-900">{mediumCount}</span>
            <span className="text-[10px] text-amber-600 block">Questions</span>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Hard</span>
            <span className="text-xl font-black text-rose-900">{hardCount}</span>
            <span className="text-[10px] text-rose-600 block">Questions</span>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-3 text-center shadow-sm">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Total</span>
            <span className="text-xl font-black text-white">{totalCount}</span>
            <span className="text-[10px] text-slate-400 block">Exact 30 MCQs</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setFilterDifficulty('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterDifficulty === 'All'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Questions ({totalCount})
          </button>
          <button
            onClick={() => setFilterDifficulty('Easy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterDifficulty === 'Easy'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            10 Easy
          </button>
          <button
            onClick={() => setFilterDifficulty('Medium')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterDifficulty === 'Medium'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            10 Medium
          </button>
          <button
            onClick={() => setFilterDifficulty('Hard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterDifficulty === 'Hard'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            10 Hard
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.map((q) => {
          const selectedOption = userAnswers[q.questionNumber];
          const optionLetters = ['A', 'B', 'C', 'D'];

          return (
            <div
              key={q.id || `q-${q.questionNumber}`}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition-colors"
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                    {q.questionNumber}
                  </span>
                  <div className="text-xs font-medium text-slate-500">
                    Question {q.questionNumber} of 30
                  </div>
                </div>

                <div>{getDifficultyBadge(q.difficulty)}</div>
              </div>

              {/* Question Text */}
              <div className="text-base font-bold text-slate-900 leading-relaxed font-sans dir-auto">
                {q.question}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-2.5 pt-1">
                {q.options.map((optText, optIdx) => {
                  const isCorrect = optIdx === q.correctAnswer;
                  const isSelected = selectedOption === optIdx;

                  let optionStyle = 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300';

                  if (showAnswers) {
                    if (isCorrect) {
                      optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-500';
                    } else if (isSelected && !isCorrect) {
                      optionStyle = 'border-rose-300 bg-rose-50 text-rose-900';
                    }
                  } else if (isSelected) {
                    optionStyle = 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold';
                  }

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSelectOption(q.questionNumber, optIdx)}
                      className={`w-full text-left p-3.5 rounded-xl border text-sm flex items-center justify-between gap-3 transition-all ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 border ${
                            showAnswers && isCorrect
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : isSelected
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          {optionLetters[optIdx]}
                        </span>
                        <span className="leading-normal dir-auto font-sans">{optText}</span>
                      </div>

                      {showAnswers && isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation (Visible if showAnswers is true) */}
              {showAnswers && q.explanation && (
                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 space-y-0.5">
                  <span className="font-bold block text-emerald-950">ഉത്തര വിവരണം (Explanation):</span>
                  <p className="dir-auto">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
