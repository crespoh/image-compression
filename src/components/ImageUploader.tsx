import React, { useRef } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
  dragActive: boolean;
  onDragStateChange: (active: boolean) => void;
  error: string | null;
  darkMode: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onFileSelect,
  dragActive,
  onDragStateChange,
  error,
  darkMode
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragStateChange(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      onDragStateChange(true);
    } else if (e.type === 'dragleave') {
      onDragStateChange(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105'
            : error
            ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
            : darkMode
            ? 'border-gray-600 hover:border-gray-500 bg-gray-700/30 hover:bg-gray-700/50'
            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDrag}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload image file"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`p-4 rounded-full transition-colors ${
            error
              ? 'bg-red-100 dark:bg-red-900/30'
              : dragActive
              ? 'bg-blue-100 dark:bg-blue-900/30'
              : darkMode 
              ? 'bg-gray-700' 
              : 'bg-slate-100'
          }`}>
            {error ? (
              <AlertCircle className="w-8 h-8 text-red-500" />
            ) : (
              <Upload className={`w-8 h-8 transition-colors ${
                dragActive
                  ? 'text-blue-600'
                  : darkMode 
                  ? 'text-gray-300' 
                  : 'text-slate-600'
              }`} />
            )}
          </div>
          <div>
            <p className={`text-lg font-semibold mb-2 ${
              error
                ? 'text-red-700 dark:text-red-300'
                : darkMode 
                ? 'text-gray-200' 
                : 'text-slate-700'
            }`}>
              {error ? 'Upload Failed' : dragActive ? 'Drop your image here' : 'Drop your image here'}
            </p>
            <p className={`mb-4 text-sm ${
              darkMode ? 'text-gray-400' : 'text-slate-500'
            }`}>
              or click to browse • JPG, PNG • Max 10MB • Max 8000×8000px
            </p>
            <button
              type="button"
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                error
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
              }`}
              aria-label="Choose image file to upload"
            >
              {error ? 'Try Again' : 'Choose File'}
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          onChange={handleFileInput}
          className="sr-only"
          aria-label="Image file input"
        />
      </div>

      {error && (
        <div 
          className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 dark:text-red-300 font-medium">Error</p>
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;