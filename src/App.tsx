import React, { useState, useEffect } from 'react';
import { Lesson, MCQQuestion, ProcessLessonResponse } from './types';
import { getAllLessons, saveLesson, deleteLesson as dbDeleteLesson } from './services/db';
import { Header } from './components/Header';
import { LessonViewer } from './components/LessonViewer';
import { QuestionViewer } from './components/QuestionViewer';
import { MyLessons } from './components/MyLessons';
import { MultiPageScanner } from './components/MultiPageScanner';
import {
  BookMarked,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'viewer' | 'questions' | 'mylessons'>('home');
  const [savedLessons, setSavedLessons] = useState<Lesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load saved lessons on launch
  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    try {
      const list = await getAllLessons();
      setSavedLessons(list);
    } catch (err) {
      console.error("Error loading lessons from IndexedDB:", err);
    }
  };

  // Process selected image(s) base64 -> Save lesson & call backend AI extraction
  const handleProcessImages = async (imagesInput: string | string[]) => {
    const pageImages = Array.isArray(imagesInput) ? imagesInput : [imagesInput];
    if (pageImages.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage(`Saving ${pageImages.length} lesson page${pageImages.length > 1 ? 's' : ''} to local storage...`);

    // Create initial lesson record
    const newLessonId = `lesson-${Date.now()}`;
    const pageCountLabel = pageImages.length > 1 ? `${pageImages.length} Pages` : '1 Page';
    const initialLesson: Lesson = {
      id: newLessonId,
      title: `Lesson (${pageCountLabel} • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      createdAt: Date.now(),
      imageDataUrl: pageImages[0],
      pageImages,
      extractedText: "",
      questions: [],
    };

    // Save locally right away
    await saveLesson(initialLesson);
    setActiveLesson(initialLesson);
    await loadLessons();

    // Call server to extract text and generate 30 MCQs across all pages
    setStatusMessage(`Analyzing ${pageImages.length} lesson page${pageImages.length > 1 ? 's' : ''} & generating 30 MCQs (10 Easy, 10 Medium, 10 Hard)...`);

    try {
      const response = await fetch("/api/process-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrls: pageImages }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data: ProcessLessonResponse = await response.json();

      const updatedLesson: Lesson = {
        ...initialLesson,
        title: data.titleSuggestion || initialLesson.title,
        extractedText: data.extractedText,
        languageDetected: data.languageDetected,
        questions: data.questions || [],
      };

      // Save updated lesson locally
      await saveLesson(updatedLesson);
      setActiveLesson(updatedLesson);
      await loadLessons();

      setStatusMessage(null);
      setIsProcessing(false);
      setCurrentView('viewer');
    } catch (err: any) {
      console.error("AI processing error:", err);
      setErrorMessage(err.message || "Could not analyze image with AI. Check server connection or GEMINI_API_KEY.");
      setIsProcessing(false);
      setStatusMessage(null);
      // Still keep saved lesson so user can view offline
      setCurrentView('viewer');
    }
  };

  // Re-generate 30 MCQs for an existing lesson
  const handleGenerateMCQsForLesson = async (lesson: Lesson) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage("Generating EXACTLY 30 MCQs (10 Easy, 10 Medium, 10 Hard)...");

    const pages = lesson.pageImages && lesson.pageImages.length > 0 ? lesson.pageImages : [lesson.imageDataUrl];

    try {
      const response = await fetch("/api/process-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrls: pages,
          extractedText: lesson.extractedText,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data: ProcessLessonResponse = await response.json();

      const updatedLesson: Lesson = {
        ...lesson,
        title: data.titleSuggestion || lesson.title,
        extractedText: data.extractedText || lesson.extractedText,
        languageDetected: data.languageDetected || lesson.languageDetected,
        questions: data.questions || [],
      };

      await saveLesson(updatedLesson);
      setActiveLesson(updatedLesson);
      await loadLessons();

      setIsProcessing(false);
      setStatusMessage(null);
      setCurrentView('questions');
    } catch (err: any) {
      console.error("Error generating MCQs:", err);
      setErrorMessage(err.message || "Failed to generate MCQs.");
      setIsProcessing(false);
      setStatusMessage(null);
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this lesson from device storage?")) {
      await dbDeleteLesson(id);
      await loadLessons();
      if (activeLesson?.id === id) {
        setActiveLesson(null);
        setCurrentView('home');
      }
    }
  };

  // Load 2-page sample Madrasa lesson for multi-page testing
  const loadSampleMadrasaPage = () => {
    const sampleSvgPage1 = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
      <rect width="800" height="1000" fill="#fdfbf7"/>
      <rect x="40" y="40" width="720" height="920" fill="none" stroke="#065f46" stroke-width="3"/>
      <rect x="50" y="50" width="700" height="900" fill="none" stroke="#d97706" stroke-width="1"/>
      <text x="400" y="110" font-family="serif" font-size="28" font-weight="bold" fill="#065f46" text-anchor="middle">തജ്‌വീദ് പാഠം 4 (പേജ് 1) : മദ്ദിന്റെ നിയമങ്ങൾ</text>
      <line x1="150" y1="130" x2="650" y2="130" stroke="#065f46" stroke-width="2"/>
      <text x="700" y="190" font-family="serif" font-size="22" fill="#111827" text-anchor="end">بسم الله الرحمن الرحيم</text>
      <text x="700" y="240" font-family="serif" font-size="20" fill="#065f46" text-anchor="end">المَدُّ لُغَةً : الزِّيَادَةُ ، وَاصْطِلَاحًا : إِطَالَةُ الصَّوْتِ بِحَرْفٍ مِنْ حُرُوفِ المَدِّ.</text>
      <text x="700" y="310" font-family="sans-serif" font-size="18" fill="#1f2937" text-anchor="end">മദ്ദ് എന്നാൽ അക്ഷര ശബ്ദത്തെ നീട്ടി ഓതൽ ആകുന്നു.</text>
      <text x="700" y="350" font-family="sans-serif" font-size="18" fill="#1f2937" text-anchor="end">മദ്ദിന്റെ അക്ഷരങ്ങൾ 3 എണ്ണമാണ് : അലിഫ് (أ), വാവ് (و), യാഅ് (ي).</text>
      <text x="700" y="420" font-family="sans-serif" font-size="18" font-weight="bold" fill="#065f46" text-anchor="end">മദ്ദ് അസ്‌ലി (المَدُّ الأَصْلِيُّ):</text>
      <text x="700" y="460" font-family="sans-serif" font-size="17" fill="#374151" text-anchor="end">ഹംസയോ സുക്കൂനോ ഇല്ലാത്ത സാധാരണ മദ്ദിനെ മദ്ദ് അസ്‌ലി എന്ന് വിളിക്കുന്നു.</text>
      <text x="700" y="500" font-family="sans-serif" font-size="17" fill="#374151" text-anchor="end">ഉദാഹരണം: قَالَ (ഖാല), قِيلَ (ഖീല), يَقُولُ (യഖൂലു).</text>
      <rect x="100" y="740" width="600" height="150" fill="#ecfdf5" stroke="#a7f3d0" rx="10"/>
      <text x="400" y="780" font-family="sans-serif" font-size="16" font-weight="bold" fill="#047857" text-anchor="middle">പേജ് 1 സംഗ്രഹം (Page 1 Summary)</text>
      <text x="680" y="820" font-family="sans-serif" font-size="15" fill="#065f46" text-anchor="end">1. മദ്ദ് അക്ഷരങ്ങൾ 3 എണ്ണം. 2. മദ്ദ് അസ്‌ലിയെ 2 ഹറകത്ത് നീട്ടണം.</text>
    </svg>`;

    const sampleSvgPage2 = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
      <rect width="800" height="1000" fill="#fdfbf7"/>
      <rect x="40" y="40" width="720" height="920" fill="none" stroke="#065f46" stroke-width="3"/>
      <rect x="50" y="50" width="700" height="900" fill="none" stroke="#d97706" stroke-width="1"/>
      <text x="400" y="110" font-family="serif" font-size="28" font-weight="bold" fill="#065f46" text-anchor="middle">തജ്‌വീദ് പാഠം 4 (പേജ് 2) : മദ്ദ് ഫർഈ</text>
      <line x1="150" y1="130" x2="650" y2="130" stroke="#065f46" stroke-width="2"/>
      <text x="700" y="200" font-family="sans-serif" font-size="18" font-weight="bold" fill="#065f46" text-anchor="end">മദ്ദ് ഫർഈ (المَدُّ الفَرْعِيُّ):</text>
      <text x="700" y="240" font-family="sans-serif" font-size="17" fill="#374151" text-anchor="end">ഹംസയോ സുക്കൂനോ കാരണം ഉണ്ടാകുന്ന മദ്ദിനെ മദ്ദ് ഫർഈ എന്ന് പറയുന്നു.</text>
      <text x="700" y="300" font-family="sans-serif" font-size="18" font-weight="bold" fill="#065f46" text-anchor="end">1. മദ്ദ് മുത്തസിൽ (المَدُّ المُمَّتَصِلُ):</text>
      <text x="700" y="340" font-family="sans-serif" font-size="17" fill="#374151" text-anchor="end">മദ്ദിന്റെ അക്ഷരത്തിന് ശേഷം അതേ വാക്കിൽ ഹംസ വന്നാൽ മദ്ദ് മുത്തസിൽ. 4 അല്ലെങ്കിൽ 5 ഹറകത്ത് നീട്ടണം.</text>
      <text x="700" y="380" font-family="sans-serif" font-size="17" fill="#374151" text-anchor="end">ഉദാഹരണം: جَاءَ (ജാഅ), جِيءَ (ജീഅ).</text>
      <text x="700" y="450" font-family="sans-serif" font-size="18" font-weight="bold" fill="#065f46" text-anchor="end">2. മദ്ദ് മുൻഫസിൽ (المَدُّ المُنْفَصِلُ):</text>
      <text x="700" y="490" font-family="sans-serif" font-size="17" fill="#374151" text-anchor="end">മദ്ദിന്റെ അക്ഷരത്തിന് ശേഷം അടുത്ത വാക്കിന്റെ തുടക്കത്തിൽ ഹംസ വന്നാൽ മദ്ദ് മുൻഫസിൽ.</text>
      <text x="700" y="530" font-family="sans-serif" font-size="17" fill="#374151" text-anchor="end">ഉദാഹരണം: يَا أَيُّهَا (യാ അയ്യുഹാ).</text>
      <rect x="100" y="740" width="600" height="150" fill="#ecfdf5" stroke="#a7f3d0" rx="10"/>
      <text x="400" y="780" font-family="sans-serif" font-size="16" font-weight="bold" fill="#047857" text-anchor="middle">പേജ് 2 സംഗ്രഹം (Page 2 Summary)</text>
      <text x="680" y="820" font-family="sans-serif" font-size="15" fill="#065f46" text-anchor="end">മദ്ദ് മുത്തസിലും മദ്ദ് മുൻഫസിലും മദ്ദ് ഫർഈയുടെ ഇനങ്ങളാണ്.</text>
    </svg>`;

    const dataUrl1 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(sampleSvgPage1)))}`;
    const dataUrl2 = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(sampleSvgPage2)))}`;

    handleProcessImages([dataUrl1, dataUrl2]);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-emerald-200">
      {/* Top Navigation */}
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        savedLessonsCount={savedLessons.length}
      />

      {/* Main Container */}
      <main className="flex-1 pb-16">
        {/* Processing / Loader Overlay */}
        {isProcessing && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600/30 border border-emerald-400/50 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
            <h3 className="text-xl font-bold mb-2">Analyzing Lesson Pages</h3>
            <p className="text-sm text-slate-300 max-w-sm">{statusMessage}</p>
            <div className="mt-6 flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Generating 30 Questions: 10 Easy + 10 Medium + 10 Hard</span>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="max-w-4xl mx-auto px-4 pt-4">
            <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-4 flex items-start gap-3 text-sm shadow-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Processing Notice:</span>
                <p>{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* VIEW 1: HOME (Scanner & Quick Controls) */}
        {currentView === 'home' && (
          <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
            {/* Title / Hero Header */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center shadow-inner">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Ahsani Lesson Scanner
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Scan Madrasa lesson pages (up to 5) • Extract Malayalam & Arabic • Generate 30 MCQs
                </p>
              </div>

              <div className="pt-1 flex items-center justify-center gap-2 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 py-1.5 px-3 rounded-xl max-w-xs mx-auto">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Exactly 30 MCQs (10 Easy • 10 Medium • 10 Hard)</span>
              </div>
            </div>

            {/* MULTI-PAGE LESSON SCANNER */}
            <MultiPageScanner
              onProcessPages={handleProcessImages}
              onTrySample={loadSampleMadrasaPage}
              isProcessing={isProcessing}
            />

            {/* MY LESSONS SHORTCUT CARD */}
            <div
              onClick={() => setCurrentView('mylessons')}
              className="bg-white border border-slate-200 hover:border-emerald-300 rounded-3xl p-5 shadow-sm flex items-center justify-between cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <BookMarked className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                    My Lessons
                  </h4>
                  <p className="text-xs text-slate-500">
                    {savedLessons.length === 0
                      ? 'No lessons saved yet'
                      : `${savedLessons.length} saved lesson${savedLessons.length > 1 ? 's' : ''} on device`}
                  </p>
                </div>
              </div>

              <span className="px-3 py-1.5 bg-slate-100 group-hover:bg-emerald-100 text-slate-700 group-hover:text-emerald-900 text-xs font-bold rounded-xl transition-colors">
                Open
              </span>
            </div>
          </div>
        )}

        {/* VIEW 2: LESSON VIEWER */}
        {currentView === 'viewer' && activeLesson && (
          <LessonViewer
            lesson={activeLesson}
            onBack={() => setCurrentView('home')}
            onGenerateMCQs={handleGenerateMCQsForLesson}
            onViewMCQs={() => setCurrentView('questions')}
            onDeleteLesson={handleDeleteLesson}
            isGenerating={isProcessing}
          />
        )}

        {/* VIEW 3: QUESTIONS VIEWER (30 MCQs) */}
        {currentView === 'questions' && activeLesson && (
          <QuestionViewer
            lesson={activeLesson}
            onBack={() => setCurrentView('viewer')}
          />
        )}

        {/* VIEW 4: MY LESSONS */}
        {currentView === 'mylessons' && (
          <MyLessons
            lessons={savedLessons}
            onSelectLesson={(lesson) => {
              setActiveLesson(lesson);
              setCurrentView('viewer');
            }}
            onDeleteLesson={handleDeleteLesson}
            onNewScan={() => setCurrentView('home')}
          />
        )}
      </main>
    </div>
  );
}
