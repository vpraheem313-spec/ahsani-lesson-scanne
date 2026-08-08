import React from 'react';
import { Lesson } from '../types';
import { BookMarked, BookOpen, Trash2, Calendar, ArrowRight, Sparkles, CheckCircle2, Plus } from 'lucide-react';

interface MyLessonsProps {
  lessons: Lesson[];
  onSelectLesson: (lesson: Lesson) => void;
  onDeleteLesson: (id: string) => void;
  onNewScan: () => void;
}

export const MyLessons: React.FC<MyLessonsProps> = ({
  lessons,
  onSelectLesson,
  onDeleteLesson,
  onNewScan,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-emerald-700" />
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">My Lessons</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Saved permanently on device offline ({lessons.length} saved)
          </p>
        </div>

        <button
          onClick={onNewScan}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Scan New Lesson Page</span>
        </button>
      </div>

      {/* Lessons List */}
      {lessons.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-base">No Saved Lessons Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Capture or upload a lesson page to generate 30 MCQs and save it permanently on your phone.
            </p>
          </div>
          <button
            onClick={onNewScan}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs inline-flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Scan First Lesson</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lessons.map((lesson) => {
            const has30MCQs = lesson.questions && lesson.questions.length === 30;

            return (
              <div
                key={lesson.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between transition-all group"
              >
                {/* Upper thumbnail + info */}
                <div className="p-4 flex gap-3.5 items-start">
                  {/* Thumbnail */}
                  <div
                    onClick={() => onSelectLesson(lesson)}
                    className="w-20 h-24 bg-slate-900 rounded-xl overflow-hidden shrink-0 border border-slate-200 cursor-pointer relative group-hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={lesson.imageDataUrl}
                      alt={lesson.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      {has30MCQs ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          30 MCQs Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          Ready to Process
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLesson(lesson.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Lesson"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3
                      onClick={() => onSelectLesson(lesson)}
                      className="font-bold text-slate-900 text-sm truncate cursor-pointer hover:text-emerald-700 transition-colors"
                    >
                      {lesson.title || 'Untitled Lesson'}
                    </h3>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(lesson.createdAt).toLocaleDateString()}</span>
                    </div>

                    {lesson.extractedText && (
                      <p className="text-xs text-slate-600 line-clamp-2 mt-2 font-sans dir-auto">
                        {lesson.extractedText}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-500">
                    {has30MCQs ? '10 Easy • 10 Medium • 10 Hard' : 'No MCQs generated yet'}
                  </span>

                  <button
                    onClick={() => onSelectLesson(lesson)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1"
                  >
                    <span>{has30MCQs ? 'View MCQs' : 'Open Lesson'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
