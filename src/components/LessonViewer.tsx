import React, { useState } from 'react';
import { Lesson } from '../types';
import { ArrowLeft, Sparkles, BookOpen, Trash2, CheckCircle, HelpCircle, FileText, ZoomIn, Calendar } from 'lucide-react';

interface LessonViewerProps {
  lesson: Lesson;
  onBack: () => void;
  onGenerateMCQs: (lesson: Lesson) => void;
  onViewMCQs: (lesson: Lesson) => void;
  onDeleteLesson: (lessonId: string) => void;
  isGenerating: boolean;
}

export const LessonViewer: React.FC<LessonViewerProps> = ({
  lesson,
  onBack,
  onGenerateMCQs,
  onViewMCQs,
  onDeleteLesson,
  isGenerating,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeTab, setActiveTab] = useState<'page' | 'text'>('page');
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);

  const pages = lesson.pageImages && lesson.pageImages.length > 0
    ? lesson.pageImages
    : (lesson.imageDataUrl ? [lesson.imageDataUrl] : []);

  const currentImage = pages[selectedPageIndex] || pages[0] || lesson.imageDataUrl;
  const hasMCQs = lesson.questions && lesson.questions.length === 30;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header / Nav */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onDeleteLesson(lesson.id)}
            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors"
            title="Delete Lesson"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lesson Title & Info Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full mb-1">
              <BookOpen className="w-3 h-3" />
              {pages.length > 1 ? `${pages.length}-Page Scanned Lesson` : 'Scanned Lesson Page'}
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {lesson.title || 'Untitled Scanned Lesson'}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {new Date(lesson.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {lesson.languageDetected && (
                <span className="bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                  {lesson.languageDetected}
                </span>
              )}
            </div>
          </div>

          {/* Primary MCQ CTA Button */}
          {hasMCQs ? (
            <button
              onClick={() => onViewMCQs(lesson)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
            >
              <CheckCircle className="w-4 h-4 text-emerald-200" />
              <span>View 30 MCQs</span>
            </button>
          ) : (
            <button
              onClick={() => onGenerateMCQs(lesson)}
              disabled={isGenerating}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-md transition-all flex items-center gap-2 text-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>{isGenerating ? 'Generating 30 MCQs...' : 'Generate 30 MCQs'}</span>
            </button>
          )}
        </div>

        {/* Requirements Banner */}
        <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3 flex items-center justify-between gap-2 text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-semibold">30 MCQ Requirement:</span>
            <span>10 Easy + 10 Medium + 10 Hard Questions</span>
          </div>
          {hasMCQs && (
            <span className="font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Ready (30/30)
            </span>
          )}
        </div>
      </div>

      {/* Tabs: Lesson Page vs Extracted Content */}
      <div className="flex items-center border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('page')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'page'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Lesson Pages ({pages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('text')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'text'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Extracted Content (Malayalam / Arabic)</span>
        </button>
      </div>

      {/* Tab 1: Lesson Page Display */}
      {activeTab === 'page' && (
        <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-inner space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1">
            <span>
              {pages.length > 1 ? `Viewing Page ${selectedPageIndex + 1} of ${pages.length}` : 'High-resolution scanned view'}
            </span>
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>{isZoomed ? 'Fit Screen' : 'Zoom Image'}</span>
            </button>
          </div>

          {/* Multi-page thumbnail selector */}
          {pages.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
              {pages.map((imgUrl, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => setSelectedPageIndex(pIdx)}
                  className={`relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedPageIndex === pIdx
                      ? 'border-emerald-400 ring-2 ring-emerald-500/50 opacity-100 scale-105'
                      : 'border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt={`Page ${pIdx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[10px] font-bold text-white text-center py-0.5">
                    Page {pIdx + 1}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="overflow-auto max-h-[70vh] flex justify-center bg-black/40 rounded-xl p-2 border border-slate-800/80">
            <img
              src={currentImage}
              alt={`Scanned Lesson Page ${selectedPageIndex + 1}`}
              className={`rounded-lg object-contain transition-all duration-300 ${
                isZoomed ? 'w-auto max-w-none' : 'w-full max-h-[65vh]'
              }`}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Extracted Text */}
      {activeTab === 'text' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            Extracted Text Content
          </h3>

          {lesson.extractedText ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-sans text-slate-800 leading-relaxed whitespace-pre-wrap text-base space-y-2 dir-auto">
              {lesson.extractedText}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">
              No extracted text found. Click "Generate 30 MCQs" to analyze the image with AI.
            </div>
          )}
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-600">
          <span className="font-semibold text-slate-900">Ahsani Lesson Scanner:</span> Scanned lesson is saved permanently on your device.
        </div>

        {hasMCQs ? (
          <button
            onClick={() => onViewMCQs(lesson)}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Open 30 MCQs</span>
          </button>
        ) : (
          <button
            onClick={() => onGenerateMCQs(lesson)}
            disabled={isGenerating}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isGenerating ? 'Analyzing & Generating...' : 'Generate 30 MCQs'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
