import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Image as ImageIcon, AlertCircle, FileImage, Zap, Moon, Sun, RotateCcw, Shield, Mail, Heart } from 'lucide-react';

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

type Preset = 'etsy' | 'shopee' | 'linkedin' | 'custom';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSIONS = 8000;

const PRESETS = {
  etsy: { name: 'Etsy', targetSize: 500 * 1024, maxWidth: 2000, maxHeight: 2000 },
  shopee: { name: 'Shopee', targetSize: 2 * 1024 * 1024, maxWidth: 3000, maxHeight: 3000 },
  linkedin: { name: 'LinkedIn Banner', targetSize: 8 * 1024 * 1024, maxWidth: 1584, maxHeight: 396, exactResize: true },
  custom: { name: 'Custom', targetSize: 1 * 1024 * 1024, maxWidth: 1920, maxHeight: 1080 }
};

// Analytics tracking function
const trackEvent = (eventName: string, properties: Record<string, any> = {}) => {
  try {
    if (typeof window !== 'undefined' && (window as any).plausible) {
      (window as any).plausible(eventName, { props: properties });
    }
  } catch (error) {
    console.warn('Analytics tracking failed:', error);
  }
};

// Error logging function
const logError = (error: Error, context: string) => {
  try {
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: { context },
        extra: { timestamp: new Date().toISOString() }
      });
    }
    console.error(`[${context}]`, error);
  } catch (e) {
    console.error('Error logging failed:', e);
  }
};

function App() {
  const [dragActive, setDragActive] = useState(false);
  const [originalImage, setOriginalImage] = useState<ImageData | null>(null);
  const [compressedImage, setCompressedImage] = useState<CompressedImage | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Preset>('etsy');
  const [quality, setQuality] = useState(80);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [previewMode, setPreviewMode] = useState<'side-by-side' | 'toggle'>('side-by-side');
  const [showOriginal, setShowOriginal] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    trackEvent('Dark Mode Toggle', { enabled: newDarkMode });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
      return 'Please upload only JPG or PNG images.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}.`;
    }
    return null;
  };

  const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const compressImage = async (
    img: HTMLImageElement,
    preset: Preset,
    customQuality: number
  ): Promise<CompressedImage> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    const presetConfig = PRESETS[preset];
    let { width, height } = img;
    
    // Handle LinkedIn banner exact resize
    if (preset === 'linkedin') {
      width = presetConfig.maxWidth;
      height = presetConfig.maxHeight;
    } else {
      // Calculate new dimensions while maintaining aspect ratio
      const aspectRatio = width / height;
      if (width > presetConfig.maxWidth) {
        width = presetConfig.maxWidth;
        height = width / aspectRatio;
      }
      if (height > presetConfig.maxHeight) {
        height = presetConfig.maxHeight;
        width = height * aspectRatio;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // Use high-quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    
    // Convert to blob with compression
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const dataUrl = canvas.toDataURL('image/jpeg', customQuality / 100);
            resolve({
              blob,
              dataUrl,
              width,
              height,
              size: blob.size
            });
          }
        },
        'image/jpeg',
        customQuality / 100
      );
    });
  };

  const handleFile = async (file: File) => {
    setError(null);
    setCompressedImage(null);
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      logError(new Error(validationError), 'File Validation');
      return;
    }

    try {
      const img = await loadImage(file);
      
      if (img.width > MAX_DIMENSIONS || img.height > MAX_DIMENSIONS) {
        const errorMsg = `Image dimensions must be less than ${MAX_DIMENSIONS}×${MAX_DIMENSIONS} pixels.`;
        setError(errorMsg);
        logError(new Error(errorMsg), 'Image Dimensions');
        return;
      }

      const imageData: ImageData = {
        file,
        dataUrl: URL.createObjectURL(file),
        width: img.width,
        height: img.height,
        size: file.size
      };

      setOriginalImage(imageData);
      
      // Track file upload
      trackEvent('Image Upload', {
        fileSize: file.size,
        width: img.width,
        height: img.height,
        fileType: file.type
      });
      
      // Auto-compress with selected preset
      setIsProcessing(true);
      const compressed = await compressImage(img, selectedPreset, quality);
      setCompressedImage(compressed);
      setIsProcessing(false);

      // Track compression completion
      trackEvent('Image Compressed', {
        preset: selectedPreset,
        quality,
        originalSize: file.size,
        compressedSize: compressed.size,
        compressionRatio: Math.round(((file.size - compressed.size) / file.size) * 100)
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError('Failed to process image. Please try again.');
      logError(error, 'Image Processing');
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handlePresetChange = async (preset: Preset) => {
    setSelectedPreset(preset);
    trackEvent('Preset Changed', { preset });
    
    if (originalImage) {
      setIsProcessing(true);
      try {
        const img = await loadImage(originalImage.file);
        const compressed = await compressImage(img, preset, quality);
        setCompressedImage(compressed);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError('Failed to reprocess image.');
        logError(error, 'Preset Change');
      }
      setIsProcessing(false);
    }
  };

  const handleQualityChange = async (newQuality: number) => {
    setQuality(newQuality);
    
    if (originalImage) {
      setIsProcessing(true);
      try {
        const img = await loadImage(originalImage.file);
        const compressed = await compressImage(img, selectedPreset, newQuality);
        setCompressedImage(compressed);
        
        trackEvent('Quality Changed', { 
          quality: newQuality, 
          preset: selectedPreset 
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError('Failed to reprocess image.');
        logError(error, 'Quality Change');
      }
      setIsProcessing(false);
    }
  };

  const downloadImage = () => {
    if (compressedImage) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(compressedImage.blob);
      link.download = `compressed_${originalImage?.file.name || 'image.jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      trackEvent('Image Downloaded', {
        preset: selectedPreset,
        quality,
        originalSize: originalImage?.size,
        compressedSize: compressedImage.size
      });
    }
  };

  const resetApp = () => {
    setOriginalImage(null);
    setCompressedImage(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    trackEvent('App Reset');
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-slate-50 to-slate-100'
    }`}>
      {/* Main Application */}
      <div className="flex items-center justify-center p-4 min-h-screen">
        <div className={`w-full max-w-4xl rounded-2xl shadow-xl border overflow-hidden transition-colors duration-300 ${
          darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-slate-200'
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Easy Image Compress</h1>
                  <p className="text-blue-100">Optimize your images for any platform</p>
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-white" />
                ) : (
                  <Moon className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>

          <div className="p-8">
            {/* Upload Area */}
            {!originalImage && (
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : darkMode
                    ? 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDrag}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className={`p-4 rounded-full ${
                    darkMode ? 'bg-gray-700' : 'bg-slate-100'
                  }`}>
                    <Upload className={`w-8 h-8 ${
                      darkMode ? 'text-gray-300' : 'text-slate-600'
                    }`} />
                  </div>
                  <div>
                    <p className={`text-lg font-semibold mb-2 ${
                      darkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      Drop your image here
                    </p>
                    <p className={`mb-4 ${
                      darkMode ? 'text-gray-400' : 'text-slate-500'
                    }`}>
                      or click to browse (JPG, PNG • Max 10MB • Max 8000×8000px)
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Choose File
                    </button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-6">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Image Processing */}
            {originalImage && (
              <div className="space-y-6">
                {/* Controls */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Preset Selection */}
                  <div>
                    <label className={`block text-sm font-semibold mb-3 ${
                      darkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      Choose Platform Preset
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(PRESETS).map(([key, preset]) => (
                        <button
                          key={key}
                          onClick={() => handlePresetChange(key as Preset)}
                          className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                            selectedPreset === key
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : darkMode
                              ? 'border-gray-600 hover:border-gray-500 text-gray-300 bg-gray-700/50'
                              : 'border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality Slider */}
                  <div>
                    <label className={`block text-sm font-semibold mb-3 ${
                      darkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      Quality: {quality}%
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="90"
                      value={quality}
                      onChange={(e) => handleQualityChange(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>50%</span>
                      <span>90%</span>
                    </div>
                  </div>
                </div>

                {/* Preview Mode Toggle */}
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-medium ${
                    darkMode ? 'text-gray-200' : 'text-slate-700'
                  }`}>
                    Preview Mode:
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewMode('side-by-side')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        previewMode === 'side-by-side'
                          ? 'bg-blue-600 text-white'
                          : darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Side by Side
                    </button>
                    <button
                      onClick={() => setPreviewMode('toggle')}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        previewMode === 'toggle'
                          ? 'bg-blue-600 text-white'
                          : darkMode
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Toggle
                    </button>
                  </div>
                </div>

                {/* Image Comparison */}
                {previewMode === 'side-by-side' ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Original */}
                    <div className="space-y-3">
                      <h3 className={`font-semibold flex items-center gap-2 ${
                        darkMode ? 'text-gray-200' : 'text-slate-700'
                      }`}>
                        <FileImage className="w-4 h-4" />
                        Original
                      </h3>
                      <div className={`rounded-lg p-4 ${
                        darkMode ? 'bg-gray-700/50' : 'bg-slate-50'
                      }`}>
                        <img
                          src={originalImage.dataUrl}
                          alt="Original"
                          className="w-full h-48 object-contain rounded-lg bg-white dark:bg-gray-800"
                        />
                        <div className={`mt-3 space-y-1 text-sm ${
                          darkMode ? 'text-gray-300' : 'text-slate-600'
                        }`}>
                          <p>Size: {formatFileSize(originalImage.size)}</p>
                          <p>Dimensions: {originalImage.width} × {originalImage.height}px</p>
                        </div>
                      </div>
                    </div>

                    {/* Compressed */}
                    <div className="space-y-3">
                      <h3 className={`font-semibold flex items-center gap-2 ${
                        darkMode ? 'text-gray-200' : 'text-slate-700'
                      }`}>
                        <ImageIcon className="w-4 h-4" />
                        Compressed
                      </h3>
                      <div className={`rounded-lg p-4 ${
                        darkMode ? 'bg-gray-700/50' : 'bg-slate-50'
                      }`}>
                        {isProcessing ? (
                          <div className={`w-full h-48 rounded-lg flex items-center justify-center ${
                            darkMode ? 'bg-gray-800' : 'bg-slate-200'
                          }`}>
                            <div className="flex flex-col items-center gap-3">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              <p className={`text-sm ${
                                darkMode ? 'text-gray-300' : 'text-slate-600'
                              }`}>
                                Compressing...
                              </p>
                            </div>
                          </div>
                        ) : compressedImage ? (
                          <img
                            src={compressedImage.dataUrl}
                            alt="Compressed"
                            className="w-full h-48 object-contain rounded-lg bg-white dark:bg-gray-800"
                          />
                        ) : null}
                        
                        {compressedImage && (
                          <div className={`mt-3 space-y-1 text-sm ${
                            darkMode ? 'text-gray-300' : 'text-slate-600'
                          }`}>
                            <p>Size: {formatFileSize(compressedImage.size)}</p>
                            <p>Dimensions: {compressedImage.width} × {compressedImage.height}px</p>
                            <p className="text-green-600 dark:text-green-400 font-medium">
                              Reduced by {Math.round(((originalImage.size - compressedImage.size) / originalImage.size) * 100)}%
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
                        {showOriginal ? 'Original' : 'Compressed'}
                      </h3>
                      <button
                        onClick={() => setShowOriginal(!showOriginal)}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Toggle View
                      </button>
                    </div>
                    <div className={`rounded-lg p-4 ${
                      darkMode ? 'bg-gray-700/50' : 'bg-slate-50'
                    }`}>
                      {showOriginal ? (
                        <>
                          <img
                            src={originalImage.dataUrl}
                            alt="Original"
                            className="w-full h-64 object-contain rounded-lg bg-white dark:bg-gray-800"
                          />
                          <div className={`mt-3 space-y-1 text-sm ${
                            darkMode ? 'text-gray-300' : 'text-slate-600'
                          }`}>
                            <p>Size: {formatFileSize(originalImage.size)}</p>
                            <p>Dimensions: {originalImage.width} × {originalImage.height}px</p>
                          </div>
                        </>
                      ) : (
                        <>
                          {isProcessing ? (
                            <div className={`w-full h-64 rounded-lg flex items-center justify-center ${
                              darkMode ? 'bg-gray-800' : 'bg-slate-200'
                            }`}>
                              <div className="flex flex-col items-center gap-3">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <p className={`text-sm ${
                                  darkMode ? 'text-gray-300' : 'text-slate-600'
                                }`}>
                                  Compressing...
                                </p>
                              </div>
                            </div>
                          ) : compressedImage ? (
                            <>
                              <img
                                src={compressedImage.dataUrl}
                                alt="Compressed"
                                className="w-full h-64 object-contain rounded-lg bg-white dark:bg-gray-800"
                              />
                              <div className={`mt-3 space-y-1 text-sm ${
                                darkMode ? 'text-gray-300' : 'text-slate-600'
                              }`}>
                                <p>Size: {formatFileSize(compressedImage.size)}</p>
                                <p>Dimensions: {compressedImage.width} × {compressedImage.height}px</p>
                                <p className="text-green-600 dark:text-green-400 font-medium">
                                  Reduced by {Math.round(((originalImage.size - compressedImage.size) / originalImage.size) * 100)}%
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
                    onClick={downloadImage}
                    disabled={!compressedImage || isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Download Compressed
                  </button>
                  <button
                    onClick={resetApp}
                    className={`px-6 py-3 border rounded-lg transition-colors font-medium ${
                      darkMode
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Upload New Image
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Information Sections */}
      <div className={`py-16 px-4 ${
        darkMode ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className="max-w-4xl mx-auto space-y-16">
          {/* About This Tool */}
          <section id="about" className="scroll-mt-8">
            <div className={`rounded-2xl p-8 shadow-lg border ${
              darkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <h2 className={`text-3xl font-bold mb-6 ${
                darkMode ? 'text-gray-100' : 'text-slate-800'
              }`}>
                About This Tool
              </h2>
              <div className="space-y-4">
                <p className={`text-lg leading-relaxed ${
                  darkMode ? 'text-gray-300' : 'text-slate-600'
                }`}>
                  Easy Image Compress is a powerful, client-side image compression tool designed specifically for online sellers and content creators. Whether you're selling on Etsy, Shopee, or creating LinkedIn banners, our tool helps you optimize your images for faster loading times and better user experience.
                </p>
                <div className="grid md:grid-cols-2 gap-6 mt-8">
                  <div className={`p-6 rounded-xl ${
                    darkMode ? 'bg-gray-700/50' : 'bg-white'
                  } border ${
                    darkMode ? 'border-gray-600' : 'border-slate-200'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-3 ${
                      darkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      Perfect for E-commerce
                    </h3>
                    <p className={`${
                      darkMode ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      Optimized presets for popular platforms like Etsy and Shopee ensure your product images meet platform requirements while maintaining quality.
                    </p>
                  </div>
                  <div className={`p-6 rounded-xl ${
                    darkMode ? 'bg-gray-700/50' : 'bg-white'
                  } border ${
                    darkMode ? 'border-gray-600' : 'border-slate-200'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-3 ${
                      darkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      Professional Results
                    </h3>
                    <p className={`${
                      darkMode ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      Advanced compression algorithms reduce file sizes by up to 80% while preserving image quality, perfect for web use and social media.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Privacy Policy */}
          <section id="privacy" className="scroll-mt-8">
            <div className={`rounded-2xl p-8 shadow-lg border ${
              darkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <h2 className={`text-3xl font-bold mb-6 flex items-center gap-3 ${
                darkMode ? 'text-gray-100' : 'text-slate-800'
              }`}>
                <Shield className="w-8 h-8 text-green-600" />
                Privacy & Security
              </h2>
              <div className="space-y-6">
                <div className={`p-6 rounded-xl border-l-4 border-green-500 ${
                  darkMode ? 'bg-green-900/20' : 'bg-green-50'
                }`}>
                  <h3 className={`text-xl font-semibold mb-3 ${
                    darkMode ? 'text-green-300' : 'text-green-800'
                  }`}>
                    100% Client-Side Processing
                  </h3>
                  <p className={`${
                    darkMode ? 'text-green-200' : 'text-green-700'
                  }`}>
                    Your images never leave your device. All compression happens directly in your browser using advanced web technologies.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className={`p-6 rounded-xl ${
                    darkMode ? 'bg-gray-700/50' : 'bg-white'
                  } border ${
                    darkMode ? 'border-gray-600' : 'border-slate-200'
                  }`}>
                    <h4 className={`font-semibold mb-2 ${
                      darkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      No File Uploads
                    </h4>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      We don't store, transmit, or have access to your images. Everything happens locally on your device.
                    </p>
                  </div>
                  
                  <div className={`p-6 rounded-xl ${
                    darkMode ? 'bg-gray-700/50' : 'bg-white'
                  } border ${
                    darkMode ? 'border-gray-600' : 'border-slate-200'
                  }`}>
                    <h4 className={`font-semibold mb-2 ${
                      darkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      No Personal Data Collection
                    </h4>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      We don't collect personal information, emails, or track your usage beyond basic analytics.
                    </p>
                  </div>
                  
                  <div className={`p-6 rounded-xl ${
                    darkMode ? 'bg-gray-700/50' : 'bg-white'
                  } border ${
                    darkMode ? 'border-gray-600' : 'border-slate-200'
                  }`}>
                    <h4 className={`font-semibold mb-2 ${
                      darkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      Secure by Design
                    </h4>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      Built with modern web security standards and served over HTTPS for maximum protection.
                    </p>
                  </div>
                  
                  <div className={`p-6 rounded-xl ${
                    darkMode ? 'bg-gray-700/50' : 'bg-white'
                  } border ${
                    darkMode ? 'border-gray-600' : 'border-slate-200'
                  }`}>
                    <h4 className={`font-semibold mb-2 ${
                      darkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      Open Source
                    </h4>
                    <p className={`text-sm ${
                      darkMode ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      Our code is transparent and auditable. You can verify exactly what happens to your images.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section id="contact" className="scroll-mt-8">
            <div className={`rounded-2xl p-8 shadow-lg border ${
              darkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <h2 className={`text-3xl font-bold mb-6 flex items-center gap-3 ${
                darkMode ? 'text-gray-100' : 'text-slate-800'
              }`}>
                <Mail className="w-8 h-8 text-blue-600" />
                Get in Touch
              </h2>
              <div className="space-y-6">
                <p className={`text-lg ${
                  darkMode ? 'text-gray-300' : 'text-slate-600'
                }`}>
                  Have questions, suggestions, or need help with image compression? We'd love to hear from you!
                </p>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className={`p-6 rounded-xl ${
                    darkMode ? 'bg-gray-700/50' : 'bg-white'
                  } border ${
                    darkMode ? 'border-gray-600' : 'border-slate-200'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-4 ${
                      darkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      Email Support
                    </h3>
                    <div className="space-y-3">
                      <a 
                        href="mailto:contact@shopcompress.com"
                        className="flex items-center gap-3 text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Mail className="w-5 h-5" />
                        contact@shopcompress.com
                      </a>
                      <p className={`text-sm ${
                        darkMode ? 'text-gray-400' : 'text-slate-600'
                      }`}>
                        We typically respond within 24 hours
                      </p>
                    </div>
                  </div>
                  
                  <div className={`p-6 rounded-xl ${
                    darkMode ? 'bg-gray-700/50' : 'bg-white'
                  } border ${
                    darkMode ? 'border-gray-600' : 'border-slate-200'
                  }`}>
                    <h3 className={`text-xl font-semibold mb-4 ${
                      darkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      Feature Requests
                    </h3>
                    <p className={`text-sm mb-3 ${
                      darkMode ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      Need a specific platform preset or feature? Let us know and we'll consider adding it to our roadmap.
                    </p>
                    <a 
                      href="mailto:features@shopcompress.com"
                      className="text-blue-600 hover:text-blue-700 transition-colors text-sm"
                    >
                      features@shopcompress.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className={`py-12 px-4 border-t ${
        darkMode 
          ? 'bg-gray-900 border-gray-700' 
          : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className={`text-xl font-bold ${
                  darkMode ? 'text-gray-100' : 'text-slate-800'
                }`}>
                  Easy Image Compress
                </span>
              </div>
              <p className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-slate-600'
              }`}>
                Professional image compression for e-commerce and content creators.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className={`font-semibold mb-4 ${
                darkMode ? 'text-gray-200' : 'text-slate-700'
              }`}>
                Quick Links
              </h4>
              <nav className="space-y-2">
                <button
                  onClick={() => scrollToSection('about')}
                  className={`block text-sm hover:text-blue-600 transition-colors ${
                    darkMode ? 'text-gray-400' : 'text-slate-600'
                  }`}
                >
                  About This Tool
                </button>
                <button
                  onClick={() => scrollToSection('privacy')}
                  className={`block text-sm hover:text-blue-600 transition-colors ${
                    darkMode ? 'text-gray-400' : 'text-slate-600'
                  }`}
                >
                  Privacy & Security
                </button>
                <button
                  onClick={() => scrollToSection('contact')}
                  className={`block text-sm hover:text-blue-600 transition-colors ${
                    darkMode ? 'text-gray-400' : 'text-slate-600'
                  }`}
                >
                  Contact
                </button>
              </nav>
            </div>
            
            {/* Contact Info */}
            <div>
              <h4 className={`font-semibold mb-4 ${
                darkMode ? 'text-gray-200' : 'text-slate-700'
              }`}>
                Contact
              </h4>
              <div className="space-y-2">
                <a 
                  href="mailto:contact@shopcompress.com"
                  className={`flex items-center gap-2 text-sm hover:text-blue-600 transition-colors ${
                    darkMode ? 'text-gray-400' : 'text-slate-600'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  contact@shopcompress.com
                </a>
              </div>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className={`pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 ${
            darkMode ? 'border-gray-700' : 'border-slate-200'
          }`}>
            <p className={`text-sm ${
              darkMode ? 'text-gray-400' : 'text-slate-600'
            }`}>
              © {new Date().getFullYear()} Easy Image Compress. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-slate-600'
              }`}>
                Built with
              </span>
              <Heart className="w-4 h-4 text-red-500" />
              <span className={`text-sm ${
                darkMode ? 'text-gray-400' : 'text-slate-600'
              }`}>
                by
              </span>
              <a 
                href="#" 
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors font-medium"
              >
                Coded Cheese
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;