import React from 'react';
import { FileImage, Image as ImageIcon, RotateCcw, Download, Loader2 } from 'lucide-react';

interface ImageData {
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  size: number;
}

interface CompressedImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  size: number;
}

interface ImagePreviewProps {
  originalImage: ImageData;
  compressedImage: CompressedImage | null;
  isProcessing: boolean;
  previewMode: 'side-by-side' | 'toggle';
  showOriginal: boolean;
  onPreviewModeChange: (mode: 'side-by-side' | 'toggle') => void;
  onToggleView: () => void;
  onDownload: () => void;
  darkMode: boolean;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ImagePreview: React.FC<ImagePreviewProps> = ({
  originalImage,
  compressedImage,
  isProcessing,
  previewMode,
  showOriginal,
  onPreviewModeChange,
  onToggleView,
  onDownload,
  darkMode
}) => {
  const compressionRatio = compressedImage 
    ? Math.round(((originalImage.size - compressedImage.size) / originalImage.size) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Preview Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className={`text-sm font-medium ${
            darkMode ? 'text-gray-200' : 'text-slate-700'
          }`}>
            Preview Mode:
          </span>
          <div className="flex gap-2" role="radiogroup" aria-label="Preview mode selection">
            <button
              type="button"
              onClick={() => onPreviewModeChange('side-by-side')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                previewMode === 'side-by-side'
                  ? 'bg-blue-600 text-white shadow-md'
                  : darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              role="radio"
              aria-checked={previewMode === 'side-by-side'}
            >
              Side by Side
            </button>
            <button
              type="button"
              onClick={() => onPreviewModeChange('toggle')}
              className={`px-3 py-1.5 text-sm rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                previewMode === 'toggle'
                  ? 'bg-blue-600 text-white shadow-md'
                  : darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              role="radio"
              aria-checked={previewMode === 'toggle'}
            >
              Toggle
            </button>
          </div>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Processing image...</span>
          </div>
        )}
      </div>

      {/* Image Comparison */}
      {previewMode === 'side-by-side' ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Original Image */}
          <div className="space-y-3">
            <h3 className={`font-semibold flex items-center gap-2 ${
              darkMode ? 'text-gray-200' : 'text-slate-700'
            }`}>
              <FileImage className="w-4 h-4" />
              Original Image
            </h3>
            <div className={`rounded-lg p-4 border ${
              darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="relative">
                <img
                  src={originalImage.dataUrl}
                  alt="Original uploaded image"
                  className="w-full h-48 object-contain rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600"
                />
              </div>
              <div className={`mt-3 space-y-1 text-sm ${
                darkMode ? 'text-gray-300' : 'text-slate-600'
              }`}>
                <p className="break-words">
                  <span className="font-medium">File:</span> {originalImage.file.name}
                </p>
                <p>
                  <span className="font-medium">Size:</span> {formatFileSize(originalImage.size)}
                </p>
                <p>
                  <span className="font-medium">Dimensions:</span> {originalImage.width} × {originalImage.height}px
                </p>
              </div>
            </div>
          </div>

          {/* Compressed Image */}
          <div className="space-y-3">
            <h3 className={`font-semibold flex items-center gap-2 ${
              darkMode ? 'text-gray-200' : 'text-slate-700'
            }`}>
              <ImageIcon className="w-4 h-4" />
              Compressed Image
            </h3>
            <div className={`rounded-lg p-4 border ${
              darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-slate-50 border-slate-200'
            }`}>
              {isProcessing ? (
                <div className={`w-full h-48 rounded-lg flex items-center justify-center border ${
                  darkMode ? 'bg-gray-800 border-gray-600' : 'bg-slate-200 border-gray-200'
                }`}>
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-300' : 'text-slate-600'
                    }`}>
                      Compressing image...
                    </p>
                  </div>
                </div>
              ) : compressedImage ? (
                <>
                  <div className="relative">
                    <img
                      src={compressedImage.dataUrl}
                      alt="Compressed image result"
                      className="w-full h-48 object-contain rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600"
                    />
                  </div>
                  <div className={`mt-3 space-y-1 text-sm ${
                    darkMode ? 'text-gray-300' : 'text-slate-600'
                  }`}>
                    <p className="break-words">
                      <span className="font-medium">File:</span> compressed_{originalImage.file.name}
                    </p>
                    <p>
                      <span className="font-medium">Size:</span> {formatFileSize(compressedImage.size)}
                    </p>
                    <p>
                      <span className="font-medium">Dimensions:</span> {compressedImage.width} × {compressedImage.height}px
                    </p>
                    <p className="text-green-600 dark:text-green-400 font-medium">
                      ↓ Reduced by {compressionRatio}% ({formatFileSize(originalImage.size - compressedImage.size)} saved)
                    </p>
                  </div>
                </>
              ) : (
                <div className={`w-full h-48 rounded-lg flex items-center justify-center border ${
                  darkMode ? 'bg-gray-800 border-gray-600' : 'bg-slate-200 border-gray-200'
                }`}>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-slate-500'
                  }`}>
                    Compressed image will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Toggle Mode */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold flex items-center gap-2 ${
              darkMode ? 'text-gray-200' : 'text-slate-700'
            }`}>
              <ImageIcon className="w-4 h-4" />
              {showOriginal ? 'Original Image' : 'Compressed Image'}
            </h3>
            <button
              type="button"
              onClick={onToggleView}
              disabled={isProcessing || !compressedImage}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`Switch to ${showOriginal ? 'compressed' : 'original'} image view`}
            >
              <RotateCcw className="w-3 h-3" />
              Toggle View
            </button>
          </div>
          <div className={`rounded-lg p-4 border ${
            darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-slate-50 border-slate-200'
          }`}>
            {showOriginal ? (
              <>
                <div className="relative">
                  <img
                    src={originalImage.dataUrl}
                    alt="Original uploaded image"
                    className="w-full h-64 object-contain rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600"
                  />
                </div>
                <div className={`mt-3 space-y-1 text-sm ${
                  darkMode ? 'text-gray-300' : 'text-slate-600'
                }`}>
                  <p className="break-words">
                    <span className="font-medium">File:</span> {originalImage.file.name}
                  </p>
                  <p>
                    <span className="font-medium">Size:</span> {formatFileSize(originalImage.size)}
                  </p>
                  <p>
                    <span className="font-medium">Dimensions:</span> {originalImage.width} × {originalImage.height}px
                  </p>
                </div>
              </>
            ) : (
              <>
                {isProcessing ? (
                  <div className={`w-full h-64 rounded-lg flex items-center justify-center border ${
                    darkMode ? 'bg-gray-800 border-gray-600' : 'bg-slate-200 border-gray-200'
                  }`}>
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <p className={`text-sm ${
                        darkMode ? 'text-gray-300' : 'text-slate-600'
                      }`}>
                        Compressing image...
                      </p>
                    </div>
                  </div>
                ) : compressedImage ? (
                  <>
                    <div className="relative">
                      <img
                        src={compressedImage.dataUrl}
                        alt="Compressed image result"
                        className="w-full h-64 object-contain rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600"
                      />
                    </div>
                    <div className={`mt-3 space-y-1 text-sm ${
                      darkMode ? 'text-gray-300' : 'text-slate-600'
                    }`}>
                      <p className="break-words">
                        <span className="font-medium">File:</span> compressed_{originalImage.file.name}
                      </p>
                      <p>
                        <span className="font-medium">Size:</span> {formatFileSize(compressedImage.size)}
                      </p>
                      <p>
                        <span className="font-medium">Dimensions:</span> {compressedImage.width} × {compressedImage.height}px
                      </p>
                      <p className="text-green-600 dark:text-green-400 font-medium">
                        ↓ Reduced by {compressionRatio}% ({formatFileSize(originalImage.size - compressedImage.size)} saved)
                      </p>
                    </div>
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onDownload}
          disabled={!compressedImage || isProcessing}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          aria-label="Download compressed image"
        >
          <Download className="w-4 h-4" />
          Download Compressed Image
          {compressedImage && (
            <span className="text-xs opacity-75">
              ({formatFileSize(compressedImage.size)})
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default ImagePreview;