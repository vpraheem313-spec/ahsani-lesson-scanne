import React from 'react';
import { BookOpen, Camera, Image as ImageIcon, BookMarked, Sparkles } from 'lucide-react';

interface HeaderProps {
  currentView: 'home' | 'viewer' | 'questions' | 'mylessons';
  onNavigate: (view: 'home' | 'viewer' | 'questions' | 'mylessons') => void;
  savedLessonsCount: number;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, savedLessonsCount }) => {
  return (
    <header className="bg-emerald-800 text-white shadow-md sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-inner">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none group-hover:text-emerald-100 transition-colors">
              Ahsani Lesson Scanner
            </h1>
            <span className="text-[11px] text-emerald-200 font-medium tracking-wide">
              MVP 001 • 30 MCQ Generator
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('mylessons')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentView === 'mylessons'
                ? 'bg-white text-emerald-900 shadow-sm font-semibold'
                : 'bg-emerald-700/80 hover:bg-emerald-700 text-emerald-50'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>My Lessons</span>
            {savedLessonsCount > 0 && (
              <span className="ml-1 bg-emerald-900 text-emerald-100 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {savedLessonsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
