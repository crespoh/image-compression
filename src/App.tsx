import React, { useState, useEffect } from 'react';
import { Zap, Moon, Sun, RotateCcw, Shield, Mail, Heart, Menu, X } from 'lucide-react';
import ImageUploader from './components/ImageUploader';
import CompressionControls from './components/CompressionControls';
import ImagePreview from './components/ImagePreview';

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
  linkedin: { name: 'LinkedIn Banner', targetSize: 2 * 1024 * 1024, maxWidth: 1584, maxHeight: 396, exactResize: true },
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
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [dimensionError, setDimensionError] = useState<string | null>(null);
  const [recompressionTimeout, setRecompressionTimeout] = useState<NodeJS.Timeout | null>(null);
  // Track the object URLs to revoke them later
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [compressedImageUrl, setCompressedImageUrl] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Scroll to top on page load/refresh
  useEffect(() => {
    // Only scroll to top on initial page load, not on component re-renders
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []); // Empty dependency array ensures this only runs once on mount

  // Handle scroll to update active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'why-use', 'how-it-works', 'tips', 'about'];
      const scrollPosition = window.scrollY + 100; // Offset for sticky nav
      
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Call once to set initial state
    
    return () => window.removeEventListener('scroll', handleScroll);
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

  const validateDimensions = (width: number, height: number): string | null => {
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      return 'Width and height must be whole numbers.';
    }
    if (width <= 0 || height <= 0) {
      return 'Width and height must be positive numbers.';
    }
    if (width > MAX_DIMENSIONS || height > MAX_DIMENSIONS) {
      return `Width and height must be less than ${MAX_DIMENSIONS}px.`;
    }
    return null;
  };
  const validateFile = (file: File): string | null => {
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/i)) {
      return 'Please upload only JPG or PNG images. Other formats are not supported.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`;
    }
    return null;
  };

  const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image. The file may be corrupted.'));
      img.src = URL.createObjectURL(file);
    });
  };

  const compressImage = async (
    img: HTMLImageElement,
    preset: Preset,
    customQuality: number,
    customDimensions?: { width: number; height: number }
  ): Promise<CompressedImage> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    let width = img.width;
    let height = img.height;

    if (preset === 'linkedin') {
      // LinkedIn banner: exact resize to specific dimensions
      width = PRESETS.linkedin.maxWidth;
      height = PRESETS.linkedin.maxHeight;
    } else if (preset === 'custom' && customDimensions) {
      // Custom preset: use user-defined dimensions
      const aspectRatio = img.width / img.height;
      let maxWidth = customDimensions.width;
      let maxHeight = customDimensions.height;
      if (width > maxWidth) {
        width = maxWidth;
        height = Math.round(width / aspectRatio);
      }
      if (height > maxHeight) {
        height = maxHeight;
        width = Math.round(height * aspectRatio);
      }
    } else {
      // Other presets: scale down while maintaining aspect ratio
      const presetConfig = PRESETS[preset];
      const aspectRatio = img.width / img.height;
      if (width > presetConfig.maxWidth) {
        width = presetConfig.maxWidth;
        height = Math.round(width / aspectRatio);
      }
      if (height > presetConfig.maxHeight) {
        height = presetConfig.maxHeight;
        width = Math.round(height * aspectRatio);
      }
    }

    canvas.width = width;
    canvas.height = height;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, width, height);
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image: canvas.toBlob returned null.'));
            return;
          }
          const dataUrl = canvas.toDataURL('image/jpeg', customQuality / 100);
          resolve({
            blob,
            dataUrl,
            width,
            height,
            size: blob.size
          });
        },
        'image/jpeg',
        customQuality / 100
      );
    });
  };

  const recompressImage = async () => {
    if (!originalImage) return;
    
    setIsProcessing(true);
    setError(null);
    setDimensionError(null);
    
    try {
      const img = await loadImage(originalImage.file);
      
      let customDimensions;
      if (selectedPreset === 'custom') {
        const validationError = validateDimensions(customWidth, customHeight);
        if (validationError) {
          setDimensionError(validationError);
          setIsProcessing(false);
          return;
        }
        customDimensions = { width: customWidth, height: customHeight };
      }
      
      const compressed = await compressImage(img, selectedPreset, quality, customDimensions);
      setCompressedImage(compressed);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError('Failed to reprocess image. Please try again.');
      logError(error, 'Image Recompression');
    }
    setIsProcessing(false);
  };
  const handleFile = async (file: File) => {
    // Plausible event for upload started
    if (typeof window !== 'undefined' && (window as any).plausible) {
      (window as any).plausible('Upload Started');
    }
    setError(null);
    setDimensionError(null);
    setCompressedImage(null);
    // Revoke previous original image URL ONLY if a new file is loaded
    if (originalImageUrl) {
      URL.revokeObjectURL(originalImageUrl);
      setOriginalImageUrl(null);
    }
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      logError(new Error(validationError), 'File Validation');
      return;
    }

    try {
      const img = await loadImage(file);
      
      if (img.width > MAX_DIMENSIONS || img.height > MAX_DIMENSIONS) {
        const errorMsg = `Image dimensions must be less than ${MAX_DIMENSIONS}×${MAX_DIMENSIONS} pixels. Your image is ${img.width}×${img.height}px.`;
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
      setOriginalImageUrl(imageData.dataUrl);
      
      // Track file upload
      trackEvent('Image Upload', {
        fileSize: file.size,
        width: img.width,
        height: img.height,
        fileType: file.type
      });
      
      // Auto-compress with selected preset
      setIsProcessing(true);
      
      let customDimensions;
      if (selectedPreset === 'custom') {
        const validationError = validateDimensions(customWidth, customHeight);
        if (validationError) {
          setDimensionError(validationError);
          setIsProcessing(false);
          return;
        }
        customDimensions = { width: customWidth, height: customHeight };
      }
      
      const compressed = await compressImage(img, selectedPreset, quality, customDimensions);
      // Revoke previous compressed image URL
      if (compressedImageUrl) {
        URL.revokeObjectURL(compressedImageUrl);
        setCompressedImageUrl(null);
      }
      setCompressedImage(compressed);
      setCompressedImageUrl(compressed.dataUrl);
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
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError('Failed to process image. Please try again with a different file.');
      logError(error, 'Image Processing');
      setIsProcessing(false);
    }
  };

  const handlePresetChange = async (preset: Preset) => {
    // Clear any pending recompression
    if (recompressionTimeout) {
      clearTimeout(recompressionTimeout);
      setRecompressionTimeout(null);
    }
    
    setSelectedPreset(preset);
    setDimensionError(null);
    setError(null);
    trackEvent('Preset Changed', { preset });
    
    // Reset custom dimensions to defaults when switching away from custom preset
    if (preset !== 'custom') {
      const presetConfig = PRESETS[preset];
      setCustomWidth(presetConfig.maxWidth);
      setCustomHeight(presetConfig.maxHeight);
    } else {
      // When switching to custom, use sensible defaults
      setCustomWidth(1920);
      setCustomHeight(1080);
    }
    
    // Remove timeout-based recompression here
  };

  const handleQualityChange = async (newQuality: number) => {
    setQuality(newQuality);
    
    if (originalImage) {
      await recompressImage();
      
      trackEvent('Quality Changed', { 
        quality: newQuality, 
        preset: selectedPreset 
      });
    }
  };

  const handleCustomDimensionChange = async (dimension: 'width' | 'height', value: string) => {
    // Clear any pending recompression
    if (recompressionTimeout) {
      clearTimeout(recompressionTimeout);
      setRecompressionTimeout(null);
    }
    
    const numValue = parseInt(value) || 0;
    
    if (dimension === 'width') {
      setCustomWidth(numValue);
    } else {
      setCustomHeight(numValue);
    }
    
    // Clear any existing dimension errors when user starts typing
    if (dimensionError) {
      setDimensionError(null);
    }
    
    // Only recompress if we have an image, are in custom mode, and value is valid
    if (originalImage && selectedPreset === 'custom' && numValue > 0) {
      // Debounce the recompression to avoid too many calls while user is typing
      const timeout = setTimeout(async () => {
        // Double-check we're still in custom mode after the delay
        if (selectedPreset === 'custom') {
          await recompressImage();
        }
        setRecompressionTimeout(null);
      }, 1000); // Increased debounce time for better UX
      setRecompressionTimeout(timeout);
    }
  };

  const downloadImage = () => {
    if (compressedImage && originalImage) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(compressedImage.blob);
      link.download = `compressed_${originalImage.file.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      trackEvent('Image Downloaded', {
        preset: selectedPreset,
        quality,
        originalSize: originalImage.size,
        compressedSize: compressedImage.size
      });
    }
  };

  const resetApp = () => {
    // Clear any pending recompression
    if (recompressionTimeout) {
      clearTimeout(recompressionTimeout);
      setRecompressionTimeout(null);
    }
    
    setOriginalImage(null);
    setCompressedImage(null);
    setError(null);
    setDimensionError(null);
    setIsProcessing(false);
    setSelectedPreset('etsy'); // Reset to default preset
    setQuality(80); // Reset to default quality
    setCustomWidth(1920); // Reset custom dimensions
    setCustomHeight(1080);
    trackEvent('App Reset');
    
    // Smooth scroll to top of the page after a brief delay to allow DOM to update
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      
      // Focus on the upload area after scrolling completes
      setTimeout(() => {
        const uploadArea = document.querySelector('[role="button"][aria-label="Upload image file"]') as HTMLElement;
        if (uploadArea) {
          uploadArea.focus();
        }
      }, 500); // Wait for scroll animation to complete
    }, 100); // Small delay to ensure DOM has updated
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (recompressionTimeout) {
        clearTimeout(recompressionTimeout);
      }
    };
  }, [recompressionTimeout]);

  // Cleanup object URLs on unmount ONLY
  useEffect(() => {
    return () => {
      if (originalImageUrl) {
        URL.revokeObjectURL(originalImageUrl);
      }
      if (compressedImageUrl) {
        URL.revokeObjectURL(compressedImageUrl);
      }
    };
  }, []);

  // Add useEffect to trigger recompression after preset or custom dimension changes
  useEffect(() => {
    if (!originalImage) return;
    // Only recompress if not currently processing
    if (isProcessing) return;
    // Validate custom dimensions if in custom mode
    if (selectedPreset === 'custom') {
      const validationError = validateDimensions(customWidth, customHeight);
      if (validationError) {
        setDimensionError(validationError);
        return;
      }
    }
    recompressImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPreset, customWidth, customHeight]);

  // Add useEffect to reset showOriginal when previewMode changes
  useEffect(() => {
    setShowOriginal(true);
  }, [previewMode]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const navHeight = 80; // Account for sticky nav height
      const elementPosition = element.offsetTop - navHeight;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
    setMobileMenuOpen(false); // Close mobile menu after clicking
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
        : 'bg-gradient-to-br from-slate-50 to-slate-100'
    }`}>
      {/* Navigation Bar */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        darkMode 
          ? 'bg-gray-900/95 backdrop-blur-sm border-gray-700' 
          : 'bg-white/95 backdrop-blur-sm border-slate-200'
      } border-b shadow-sm`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              onClick={() => scrollToSection('home')}
              className="flex items-center gap-2 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-2 py-1"
            >
              <div className="p-1.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className={darkMode ? 'text-gray-100' : 'text-slate-800'}>
                Easy Image Compress
              </span>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {[
                { id: 'home', label: 'Home' },
                { id: 'why-use', label: 'Why Use' },
                { id: 'how-it-works', label: 'How It Works' },
                { id: 'tips', label: 'Tips' },
                { id: 'about', label: 'About' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    activeSection === item.id
                      ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30'
                      : darkMode
                      ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Dark Mode Toggle & Mobile Menu */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  darkMode
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
                title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`md:hidden p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  darkMode
                    ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Menu className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className={`md:hidden py-4 border-t ${
              darkMode ? 'border-gray-700' : 'border-slate-200'
            }`}>
              <div className="space-y-2">
                {[
                  { id: 'home', label: 'Home' },
                  { id: 'why-use', label: 'Why Use' },
                  { id: 'how-it-works', label: 'How It Works' },
                  { id: 'tips', label: 'Tips' },
                  { id: 'about', label: 'About' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      activeSection === item.id
                        ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30'
                        : darkMode
                        ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>
      {/* Main Application */}
      <div id="home" className="flex items-center justify-center p-4 min-h-screen">
        <div className={`w-full max-w-5xl rounded-2xl shadow-xl border overflow-hidden transition-colors duration-300 ${
          darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-slate-200'
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Easy Image Compress</h1>
                  <p className="text-blue-100">Professional image optimization for any platform</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Upload Area */}
            {!originalImage && (
              <ImageUploader
                onFileSelect={handleFile}
                dragActive={dragActive}
                onDragStateChange={setDragActive}
                error={error}
                darkMode={darkMode}
              />
            )}

            {/* Image Processing */}
            {originalImage && (
              <div className="space-y-8">
                {/* Controls */}
                <CompressionControls
                  selectedPreset={selectedPreset}
                  onPresetChange={handlePresetChange}
                  quality={quality}
                  onQualityChange={handleQualityChange}
                  customWidth={customWidth}
                  customHeight={customHeight}
                  onCustomDimensionChange={handleCustomDimensionChange}
                  dimensionError={dimensionError}
                  darkMode={darkMode}
                  isProcessing={isProcessing}
                  compressedImage={compressedImage}
                />

                {/* Image Preview */}
                <ImagePreview
                  originalImage={originalImage}
                  compressedImage={compressedImage}
                  isProcessing={isProcessing}
                  previewMode={previewMode}
                  showOriginal={showOriginal}
                  onPreviewModeChange={setPreviewMode}
                  onToggleView={() => setShowOriginal(!showOriginal)}
                  onDownload={downloadImage}
                  darkMode={darkMode}
                />

                {/* Reset Button */}
                <div className="flex justify-center pt-4">
                  <button
                    onClick={resetApp}
                    className={`flex items-center gap-2 px-6 py-3 border rounded-lg transition-all duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      darkMode
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
                    }`}
                    aria-label="Upload a new image"
                  >
                    <RotateCcw className="w-4 h-4" />
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
          {/* Why Use Easy Image Compress */}
          <section id="why-use" className="max-w-2xl mx-auto text-center scroll-mt-20">
            <h2 className={`text-3xl font-bold mb-6 ${
              darkMode ? 'text-gray-100' : 'text-slate-800'
            }`}>
              Why Use Easy Image Compress?
            </h2>
            <div className="space-y-4 text-left">
              <p className={`text-lg leading-relaxed ${
                darkMode ? 'text-gray-300' : 'text-slate-600'
              }`}>
                Online sellers on platforms like Etsy and Shopee often struggle with image file size limits that can prevent them from uploading high-quality product photos. Large image files slow down page loading times, hurt SEO rankings, and create poor user experiences for potential customers.
              </p>
              <p className={`text-lg leading-relaxed ${
                darkMode ? 'text-gray-300' : 'text-slate-600'
              }`}>
                Easy Image Compress solves these problems by reducing file sizes by up to 80% while maintaining visual quality. Our tool is specifically designed for e-commerce sellers who need fast, reliable image optimization without compromising on the professional appearance of their product listings.
              </p>
              <p className={`text-lg leading-relaxed ${
                darkMode ? 'text-gray-300' : 'text-slate-600'
              }`}>
                Unlike generic image compressors, we provide platform-specific presets that automatically optimize your images for Etsy's 500KB limit, Shopee's requirements, and LinkedIn's banner dimensions, saving you time and ensuring compliance with each platform's specifications.
              </p>
            </div>
          </section>

          {/* How It Works */}
          <section id="how-it-works" className="max-w-2xl mx-auto scroll-mt-20">
            <h2 className={`text-3xl font-bold mb-6 text-center ${
              darkMode ? 'text-gray-100' : 'text-slate-800'
            }`}>
              How It Works
            </h2>
            <div className={`rounded-2xl p-8 shadow-lg border ${
              darkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h3 className={`font-semibold mb-2 ${
                      darkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      Upload Your Image
                    </h3>
                    <p className={`${
                      darkMode ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      Drag and drop your JPG or PNG image file, or click to browse. Files up to 10MB and 8000×8000 pixels are supported.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h3 className={`font-semibold mb-2 ${
                      darkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      Choose Your Platform
                    </h3>
                    <p className={`${
                      darkMode ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      Select from Etsy, Shopee, LinkedIn Banner, or Custom presets. Each preset automatically applies the optimal compression settings for that platform.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h3 className={`font-semibold mb-2 ${
                      darkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      Adjust Quality Settings
                    </h3>
                    <p className={`${
                      darkMode ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      Fine-tune the compression quality using our slider. Preview the results in real-time to find the perfect balance between file size and image quality.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    4
                  </div>
                  <div>
                    <h3 className={`font-semibold mb-2 ${
                      darkMode ? 'text-gray-200' : 'text-slate-700'
                    }`}>
                      Download Optimized Image
                    </h3>
                    <p className={`${
                      darkMode ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      Download your compressed image instantly. The file will be properly sized for your chosen platform and ready to upload to your store or profile.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </section>

          {/* Tips for Etsy and Shopee Sellers */}
          <section id="tips" className="max-w-2xl mx-auto scroll-mt-20">
            <h2 className={`text-3xl font-bold mb-6 text-center ${
              darkMode ? 'text-gray-100' : 'text-slate-800'
            }`}>
              Tips for Etsy and Shopee Sellers
            </h2>
            <div className="space-y-6">
              <div className={`rounded-2xl p-6 shadow-lg border ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <h3 className={`text-xl font-semibold mb-4 ${
                  darkMode ? 'text-gray-200' : 'text-slate-700'
                }`}>
                  Common Image Upload Frustrations
                </h3>
                <ul className={`space-y-3 ${
                  darkMode ? 'text-gray-300' : 'text-slate-600'
                }`}>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold">•</span>
                    <span>Etsy's 500KB file size limit prevents uploading high-resolution product photos</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold">•</span>
                    <span>Shopee's image requirements can be confusing and vary by region</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold">•</span>
                    <span>Manual resizing often results in blurry or pixelated images</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-500 font-bold">•</span>
                    <span>Time-consuming trial and error to find the right compression settings</span>
                  </li>
                </ul>
              </div>

              <div className={`rounded-2xl p-6 shadow-lg border ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <h3 className={`text-xl font-semibold mb-4 ${
                  darkMode ? 'text-gray-200' : 'text-slate-700'
                }`}>
                  How Easy Image Compress Helps
                </h3>
                <ul className={`space-y-3 ${
                  darkMode ? 'text-gray-300' : 'text-slate-600'
                }`}>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>Automatically compresses images to meet Etsy's 500KB requirement while maintaining quality</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>Shopee preset ensures your product images load quickly and look professional</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>Advanced algorithms preserve image sharpness and color accuracy</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>One-click optimization saves hours of manual editing time</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>Client-side processing means your images never leave your device</span>
                  </li>
                </ul>
              </div>

              <div className={`rounded-2xl p-6 shadow-lg border border-blue-200 ${
                darkMode ? 'bg-blue-900/20' : 'bg-blue-50'
              }`}>
                <h3 className={`text-xl font-semibold mb-4 ${
                  darkMode ? 'text-blue-300' : 'text-blue-700'
                }`}>
                  Pro Tips for Better Sales
                </h3>
                <ul className={`space-y-3 ${
                  darkMode ? 'text-blue-200' : 'text-blue-600'
                }`}>
                  <li className="flex items-start gap-3">
                    <span className="font-bold">💡</span>
                    <span>Use the highest quality setting that still meets file size requirements for the best visual impact</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-bold">💡</span>
                    <span>Compress all your product images consistently to maintain a professional store appearance</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-bold">💡</span>
                    <span>Faster-loading images improve customer experience and can boost your search rankings</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-bold">💡</span>
                    <span>Test your compressed images on mobile devices where most customers browse</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* About This Tool */}
          <section id="about" className="scroll-mt-20">
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
          <section id="privacy" className="scroll-mt-20">
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
          <section id="contact" className="scroll-mt-20">
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
                        href="mailto:info@codedcheese.com"
                        className="flex items-center gap-3 text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Mail className="w-5 h-5" />
                        info@codedcheese.com
                      </a>
                      <p className={`text-sm ${
                        darkMode ? 'text-gray-400' : 'text-slate-600'
                      }`}>
                        We typically respond within 48 hours
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
                      href="mailto:features@codedcheese.com"
                      className="text-blue-600 hover:text-blue-700 transition-colors text-sm"
                    >
                      features@codedcheese.com
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
                  className={`block text-sm hover:text-blue-600 transition-colors focus:outline-none focus:text-blue-600 ${
                    darkMode ? 'text-gray-400' : 'text-slate-600'
                  }`}
                >
                  About This Tool
                </button>
                <button
                  onClick={() => scrollToSection('privacy')}
                  className={`block text-sm hover:text-blue-600 transition-colors focus:outline-none focus:text-blue-600 ${
                    darkMode ? 'text-gray-400' : 'text-slate-600'
                  }`}
                >
                  Privacy & Security
                </button>
                <button
                  onClick={() => scrollToSection('contact')}
                  className={`block text-sm hover:text-blue-600 transition-colors focus:outline-none focus:text-blue-600 ${
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
                  href="mailto:info@codedcheese.com"
                  className={`flex items-center gap-2 text-sm hover:text-blue-600 transition-colors ${
                    darkMode ? 'text-gray-400' : 'text-slate-600'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  info@codedcheese.com
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
                href="https://codedcheese.com" 
                className="text-sm text-blue-600 hover:text-blue-700 transition-colors font-medium focus:outline-none focus:underline"
                target="_blank"
                rel="noopener noreferrer"
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