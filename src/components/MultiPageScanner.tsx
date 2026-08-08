import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Plus, Trash2, RefreshCw, Sparkles, BookOpen, Layers } from 'lucide-react';
import { CameraModal } from './CameraModal';

interface MultiPageScannerProps {
  onProcessPages: (images: string[]) => void;
  onTrySample: () => void;
  isProcessing: boolean;
}

export const MultiPageScanner: React.FC<MultiPageScannerProps> = ({
  onProcessPages,
  onTrySample,
  isProcessing,
}) => {
  const [pages, setPages] = useState<string[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [targetPageIndex, setTargetPageIndex] = useState<number | null>(null); // null means append new page, number means replace existing page
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle adding or replacing a page image
  const handleAddPageImage = (dataUrl: string) => {
    if (targetPageIndex !== null) {
      // Replace existing page
      setPages((prev) => {
        const next = [...prev];
        next[targetPageIndex] = dataUrl;
        return next;
      });
      setTargetPageIndex(null);
    } else {
      // Append new page up to max 5
      if (pages.length < 5) {
        setPages((prev) => [...prev, dataUrl]);
      }
    }
  };

  const handleGalleryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          handleAddPageImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset file input so selecting same file again works
    e.target.value = '';
  };

  const triggerGalleryForNew = () => {
    if (pages.length >= 5) return;
    setTargetPageIndex(null);
    fileInputRef.current?.click();
  };

  const triggerGalleryForReplace = (index: number) => {
    setTargetPageIndex(index);
    fileInputRef.current?.click();
  };

  const triggerCameraForNew = () => {
    if (pages.length >= 5) return;
    setTargetPageIndex(null);
    setIsCameraOpen(true);
  };

  const triggerCameraForReplace = (index: number) => {
    setTargetPageIndex(index);
    setIsCameraOpen(true);
  };

  const handleRemovePage = (index: number) => {
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = () => {
    if (pages.length === 0) return;
    onProcessPages(pages);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
      {/* Hidden File Input for Gallery Selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryFileChange}
        className="hidden"
      />

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            Scan or Upload Lesson Pages
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add up to 5 pages for ONE lesson (minimum 1 page)
          </p>
        </div>

        {/* Counter Badge */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
            pages.length === 5
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : pages.length > 0
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          {pages.length} / 5 pages selected
        </span>
      </div>

      {/* Pages Preview Grid / Thumbnails List */}
      {pages.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pages.map((imgUrl, index) => (
              <div
                key={index}
                className="relative bg-slate-900 border-2 border-slate-200 hover:border-emerald-500 rounded-2xl overflow-hidden shadow-sm transition-all group flex flex-col justify-between"
              >
                {/* Page Badge */}
                <div className="absolute top-2 left-2 z-10 bg-slate-950/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[11px] font-bold border border-slate-700 shadow-sm">
                  Page {index + 1}
                </div>

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => handleRemovePage(index)}
                  className="absolute top-2 right-2 z-10 bg-rose-600/90 hover:bg-rose-700 text-white p-1.5 rounded-lg transition-colors shadow-md"
                  title={`Remove Page ${index + 1}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Thumbnail Image */}
                <div className="h-32 w-full bg-slate-950 flex items-center justify-center p-1">
                  <img
                    src={imgUrl}
                    alt={`Page ${index + 1}`}
                    className="h-full w-full object-contain rounded-lg"
                  />
                </div>

                {/* Replace Action Bar */}
                <div className="p-1.5 bg-slate-100 border-t border-slate-200 flex items-center justify-around text-xs">
                  <button
                    type="button"
                    onClick={() => triggerCameraForReplace(index)}
                    className="flex items-center gap-1 text-[11px] text-slate-700 hover:text-emerald-700 font-semibold py-0.5 px-1.5 rounded hover:bg-slate-200"
                  >
                    <Camera className="w-3 h-3 text-emerald-600" />
                    <span>Retake</span>
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => triggerGalleryForReplace(index)}
                    className="flex items-center gap-1 text-[11px] text-slate-700 hover:text-emerald-700 font-semibold py-0.5 px-1.5 rounded hover:bg-slate-200"
                  >
                    <ImageIcon className="w-3 h-3 text-emerald-600" />
                    <span>Replace</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Add Page Tile if under 5 pages */}
            {pages.length < 5 && (
              <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50 rounded-2xl h-44 flex flex-col items-center justify-center p-3 text-center transition-all">
                <span className="text-xs font-bold text-emerald-800 mb-2">
                  Add Page {pages.length + 1}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={triggerCameraForNew}
                    className="p-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow transition-transform active:scale-95 flex flex-col items-center text-[10px] font-semibold"
                    title="Capture with Camera"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={triggerGalleryForNew}
                    className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-xl transition-transform active:scale-95 flex flex-col items-center text-[10px] font-semibold"
                    title="Select from Gallery"
                  >
                    <ImageIcon className="w-4 h-4 text-emerald-700" />
                    <span>Gallery</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Initial State (0 pages selected): Primary Camera & Gallery Options */}
      {pages.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 1. CAMERA BUTTON */}
          <button
            type="button"
            onClick={triggerCameraForNew}
            className="p-5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-2xl shadow-md transition-all active:scale-95 flex flex-col items-center justify-center gap-2 group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-sm">Capture Page 1 (Camera)</span>
            <span className="text-[11px] text-emerald-200">Snap page photo</span>
          </button>

          {/* 2. GALLERY BUTTON */}
          <button
            type="button"
            onClick={triggerGalleryForNew}
            className="p-5 bg-emerald-50 hover:bg-emerald-100 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl transition-all active:scale-95 flex flex-col items-center justify-center gap-2 group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <ImageIcon className="w-6 h-6" />
            </div>
            <span className="font-bold text-slate-800 text-sm">Select Page 1 (Gallery)</span>
            <span className="text-[11px] text-slate-500">Pick image from gallery</span>
          </button>
        </div>
      )}

      {/* Add Page Button when at least 1 page is added and < 5 */}
      {pages.length > 0 && pages.length < 5 && (
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={triggerCameraForNew}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <Camera className="w-3.5 h-3.5" />
              <span>Add Page {pages.length + 1} (Camera)</span>
            </button>
            <button
              type="button"
              onClick={triggerGalleryForNew}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
              <span>Add Page {pages.length + 1} (Gallery)</span>
            </button>
          </div>
        </div>
      )}

      {/* Max Pages Warning if 5 pages selected */}
      {pages.length === 5 && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium text-center">
          Maximum limit of 5 pages per lesson reached.
        </div>
      )}

      {/* Primary Action Button: Process Lesson */}
      {pages.length > 0 && (
        <div className="pt-2 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={handleProcess}
            disabled={isProcessing}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-base"
          >
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span>
              {isProcessing
                ? `Extracting ${pages.length} Page${pages.length > 1 ? 's' : ''}...`
                : `Process ${pages.length} Page${pages.length > 1 ? 's' : ''} & Generate 30 MCQs`}
            </span>
          </button>
          <p className="text-[11px] text-slate-500 text-center">
            Combines content across all selected pages to generate 30 MCQs (10 Easy + 10 Medium + 10 Hard)
          </p>
        </div>
      )}

      {/* Sample Demo Button */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={onTrySample}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Try Sample Madrasa Lesson (Multi-Page Test)</span>
        </button>
      </div>

      {/* Camera Capture Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleAddPageImage}
      />
    </div>
  );
};
