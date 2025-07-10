import React, { useState, useCallback, useEffect } from 'react';
import { Moon, Sun, Upload, Zap, Shield, Clock, Target, CheckCircle, ArrowRight, Menu, X } from 'lucide-react';
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

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || 
             (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [originalImage, setOriginalImage] = useState<ImageData | null>(null);
  const [compressedImage, setCompressedImage] = useState<CompressedImage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('etsy');
  const [quality, setQuality] = useState(80);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensionError, setDimensionError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'side-by-side' | 'toggle'>('side-by-side');
  const [showOriginal, setShowOriginal] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  const validateDimensions = (width: number, height: number): string | null => {
    if (width < 1 || height < 1) {
      return 'Width and height must be at least 1 pixel';
    }
    if (width > 8000 || height > 8000) {
      return 'Maximum dimensions are 8000×8000 pixels';
    }
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      return 'Dimensions must be whole numbers';
    }
    return null;
  };

  const handleCustomDimensionChange = (dimension: 'width' | 'height', value: string) => {
    const numValue = parseInt(value) || 0;
    
    if (dimension === 'width') {
      setCustomWidth(numValue);
    } else {
      setCustomHeight(numValue);
    }
    
    const newWidth = dimension === 'width' ? numValue : customWidth;
    const newHeight = dimension === 'height' ? numValue : customHeight;
    
    const error = validateDimensions(newWidth, newHeight);
    setDimensionError(error);
    
    // Re-process image if valid and image exists
    if (!error && originalImage) {
      processImage(originalImage, selectedPreset, quality, newWidth, newHeight);
    }
  };

  const validateFile = (file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      return 'Please select a JPG or PNG image file.';
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return 'File size must be less than 10MB.';
    }
    
    return null;
  };

  const loadImage = (file: File): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        img.onload = () => {
          if (img.width > 8000 || img.height > 8000) {
            reject(new Error('Image dimensions must not exceed 8000×8000 pixels.'));
            return;
          }
          
          resolve({
            file,
            dataUrl,
            width: img.width,
            height: img.height,
            size: file.size
          });
        };
        img.onerror = () => reject(new Error('Failed to load image.'));
        img.src = dataUrl;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  };

  const getPresetSettings = (preset: string) => {
    switch (preset) {
      case 'etsy':
        return { maxWidth: 2000, maxHeight: 2000, targetSize: 500 * 1024 };
      case 'shopee':
        return { maxWidth: 3000, maxHeight: 3000, targetSize: 2 * 1024 * 1024 };
      case 'linkedin':
        return { maxWidth: 1584, maxHeight: 396, targetSize: 2 * 1024 * 1024, exactResize: true };
      case 'custom':
        return { maxWidth: customWidth, maxHeight: customHeight, targetSize: Infinity };
      default:
        return { maxWidth: 2000, maxHeight: 2000, targetSize: 500 * 1024 };
    }
  };

  const resizeImage = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    maxWidth: number,
    maxHeight: number,
    exactResize: boolean = false
  ): { width: number; height: number } => {
    let { width, height } = img;
    
    if (exactResize) {
      width = maxWidth;
      height = maxHeight;
    } else {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      if (ratio < 1) {
        width *= ratio;
        height *= ratio;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    
    return { width, height };
  };

  const compressToTargetSize = async (
    canvas: HTMLCanvasElement,
    targetSize: number,
    initialQuality: number
  ): Promise<{ blob: Blob; finalQuality: number }> => {
    let currentQuality = initialQuality;
    let blob: Blob;
    
    do {
      blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((result) => {
          resolve(result!);
        }, 'image/jpeg', currentQuality / 100);
      });
      
      if (blob.size <= targetSize || currentQuality <= 50) {
        break;
      }
      
      currentQuality -= 5;
    } while (currentQuality > 50);
    
    return { blob, finalQuality: currentQuality };
  };

  const processImage = async (
    imageData: ImageData,
    preset: string,
    qualityValue: number,
    customW?: number,
    customH?: number
  ) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const settings = preset === 'custom' && customW && customH 
        ? { maxWidth: customW, maxHeight: customH, targetSize: Infinity }
        : getPresetSettings(preset);
      
      const img = new Image();
      img.src = imageData.dataUrl;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      const dimensions = resizeImage(
        canvas, 
        ctx, 
        img, 
        settings.maxWidth, 
        settings.maxHeight, 
        settings.exactResize
      );
      
      let blob: Blob;
      
      if (settings.targetSize === Infinity) {
        blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((result) => {
            resolve(result!);
          }, imageData.file.type === 'image/png' ? 'image/png' : 'image/jpeg', qualityValue / 100);
        });
      } else {
        const result = await compressToTargetSize(canvas, settings.targetSize, qualityValue);
        blob = result.blob;
      }
      
      const compressedDataUrl = URL.createObjectURL(blob);
      
      setCompressedImage({
        blob,
        dataUrl: compressedDataUrl,
        width: dimensions.width,
        height: dimensions.height,
        size: blob.size
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    const fileError = validateFile(file);
    if (fileError) {
      setError(fileError);
      return;
    }
    
    setError(null);
    setCompressedImage(null);
    
    try {
      const imageData = await loadImage(file);
      setOriginalImage(imageData);
      await processImage(imageData, selectedPreset, quality);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load image');
    }
  }, [selectedPreset, quality]);

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    if (originalImage) {
      processImage(originalImage, preset, quality);
    }
  };

  const handleQualityChange = (newQuality: number) => {
    setQuality(newQuality);
    if (originalImage) {
      processImage(originalImage, selectedPreset, newQuality);
    }
  };

  const handleDownload = () => {
    if (!compressedImage || !originalImage) return;
    
    const link = document.createElement('a');
    link.href = compressedImage.dataUrl;
    link.download = `compressed_${originalImage.file.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadNew = () => {
    setOriginalImage(null);
    setCompressedImage(null);
    setError(null);
    setDimensionError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-slate-50 to-blue-50'
    }`}>
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 backdrop-blur-sm transition-all duration-300 ${
        darkMode ? 'bg-gray-900/95 border-gray-700' : 'bg-white/95 border-gray-200'
      } border-b`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${
                darkMode ? 'bg-blue-600' : 'bg-blue-600'
              }`}>
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className={`font-bold text-lg ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Easy Image Compress
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection('top')}
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('why-use')}
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Why Use
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('tips')}
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                Tips
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className={`text-sm font-medium transition-colors hover:text-blue-600 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                About
              </button>
            </div>

            {/* Dark Mode Toggle & Mobile Menu */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`md:hidden p-2 rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className={`md:hidden py-4 border-t ${
              darkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => scrollToSection('top')}
                  className={`text-left text-sm font-medium transition-colors hover:text-blue-600 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => scrollToSection('why-use')}
                  className={`text-left text-sm font-medium transition-colors hover:text-blue-600 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Why Use
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className={`text-left text-sm font-medium transition-colors hover:text-blue-600 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  How It Works
                </button>
                <button
                  onClick={() => scrollToSection('tips')}
                  className={`text-left text-sm font-medium transition-colors hover:text-blue-600 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  Tips
                </button>
                <button
                  onClick={() => scrollToSection('about')}
                  className={`text-left text-sm font-medium transition-colors hover:text-blue-600 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                >
                  About
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div id="top" className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className={`p-3 rounded-xl ${
              darkMode ? 'bg-blue-600' : 'bg-blue-600'
            } shadow-lg`}>
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className={`text-4xl md:text-5xl font-bold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Easy Image Compress
            </h1>
          </div>
          <p className={`text-xl mb-8 max-w-2xl mx-auto leading-relaxed ${
            darkMode ? 'text-gray-300' : 'text-slate-600'
          }`}>
            Professional image compression tool for e-commerce and content creators. 
            Compress JPG and PNG images with presets for Etsy, Shopee, LinkedIn and more.
          </p>
          
          {/* Feature highlights */}
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-8">
            <div className={`p-4 rounded-lg ${
              darkMode ? 'bg-gray-800/50' : 'bg-white/70'
            } backdrop-blur-sm`}>
              <Shield className={`w-6 h-6 mx-auto mb-2 ${
                darkMode ? 'text-green-400' : 'text-green-600'
              }`} />
              <p className={`text-sm font-medium ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                100% Client-Side
              </p>
              <p className={`text-xs ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Your images never leave your device
              </p>
            </div>
            <div className={`p-4 rounded-lg ${
              darkMode ? 'bg-gray-800/50' : 'bg-white/70'
            } backdrop-blur-sm`}>
              <Clock className={`w-6 h-6 mx-auto mb-2 ${
                darkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <p className={`text-sm font-medium ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Instant Processing
              </p>
              <p className={`text-xs ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                No uploads or waiting times
              </p>
            </div>
            <div className={`p-4 rounded-lg ${
              darkMode ? 'bg-gray-800/50' : 'bg-white/70'
            } backdrop-blur-sm`}>
              <Target className={`w-6 h-6 mx-auto mb-2 ${
                darkMode ? 'text-purple-400' : 'text-purple-600'
              }`} />
              <p className={`text-sm font-medium ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Platform Presets
              </p>
              <p className={`text-xs ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Optimized for Etsy, Shopee, LinkedIn
              </p>
            </div>
          </div>
        </div>

        {/* Image Processing Tool */}
        {!originalImage ? (
          <div className={`rounded-2xl p-8 mb-12 ${
            darkMode ? 'bg-gray-800/50' : 'bg-white/80'
          } backdrop-blur-sm shadow-xl border ${
            darkMode ? 'border-gray-700' : 'border-white/20'
          }`}>
            <ImageUploader
              onFileSelect={handleFileSelect}
              dragActive={dragActive}
              onDragStateChange={setDragActive}
              error={error}
              darkMode={darkMode}
            />
          </div>
        ) : (
          <div className="space-y-8 mb-12">
            {/* Compression Controls */}
            <div className={`rounded-2xl p-6 ${
              darkMode ? 'bg-gray-800/50' : 'bg-white/80'
            } backdrop-blur-sm shadow-xl border ${
              darkMode ? 'border-gray-700' : 'border-white/20'
            }`}>
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
            </div>

            {/* Image Preview */}
            <div className={`rounded-2xl p-6 ${
              darkMode ? 'bg-gray-800/50' : 'bg-white/80'
            } backdrop-blur-sm shadow-xl border ${
              darkMode ? 'border-gray-700' : 'border-white/20'
            }`}>
              <ImagePreview
                originalImage={originalImage}
                compressedImage={compressedImage}
                isProcessing={isProcessing}
                previewMode={previewMode}
                showOriginal={showOriginal}
                onPreviewModeChange={setPreviewMode}
                onToggleView={() => setShowOriginal(!showOriginal)}
                onDownload={handleDownload}
                darkMode={darkMode}
              />
            </div>

            {/* Upload New Image Button */}
            <div className="text-center">
              <button
                onClick={handleUploadNew}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Upload className="w-4 h-4" />
                Upload New Image
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SEO-Friendly Content Sections */}
      <div className="max-w-6xl mx-auto px-4">
        {/* Why Use Easy Image Compress Section */}
        <section id="why-use" className="max-w-2xl mx-auto px-4 pt-24 pb-12">
          <h2 className={`text-2xl font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Why Use Easy Image Compress?
          </h2>
          <p className={`leading-relaxed mb-4 ${
            darkMode ? 'text-gray-300' : 'text-slate-600'
          }`}>
            E-commerce sellers on platforms like Etsy and Shopee face constant challenges with image file size limits and loading speeds. Large image files can slow down your product listings, hurt your search rankings, and frustrate potential customers.
          </p>
          <p className={`leading-relaxed mb-4 ${
            darkMode ? 'text-gray-300' : 'text-slate-600'
          }`}>
            Our tool solves these problems by providing instant, client-side image compression that maintains visual quality while dramatically reducing file sizes. Unlike other tools that upload your images to servers, everything happens directly in your browser for maximum privacy and speed.
          </p>
          <p className={`leading-relaxed ${
            darkMode ? 'text-gray-300' : 'text-slate-600'
          }`}>
            With platform-specific presets, you can optimize images for Etsy's 500KB recommendation, Shopee's 2MB limit, or LinkedIn's exact banner dimensions without guesswork.
          </p>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="max-w-2xl mx-auto px-4 pt-24 pb-12">
          <h2 className={`text-2xl font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            How It Works
          </h2>
          <p className={`leading-relaxed mb-6 ${
            darkMode ? 'text-gray-300' : 'text-slate-600'
          }`}>
            Our image compression tool is designed for simplicity and efficiency. Follow these four steps to optimize your images:
          </p>
          <ol className={`leading-relaxed space-y-4 ${
            darkMode ? 'text-gray-300' : 'text-slate-600'
          }`}>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <div>
                <strong className={darkMode ? 'text-white' : 'text-gray-900'}>Upload your image:</strong>
                <span className="ml-1">Drag and drop your JPG or PNG file, or click to browse. Files up to 10MB and 8000×8000 pixels are supported.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <div>
                <strong className={darkMode ? 'text-white' : 'text-gray-900'}>Choose a preset:</strong>
                <span className="ml-1">Select from Etsy (500KB), Shopee (2MB), LinkedIn Banner (exact resize), or Custom dimensions to match your platform's requirements.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <div>
                <strong className={darkMode ? 'text-white' : 'text-gray-900'}>Adjust quality:</strong>
                <span className="ml-1">Use the slider to fine-tune compression quality from 50% (smaller file) to 95% (better quality) based on your needs.</span>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
              <div>
                <strong className={darkMode ? 'text-white' : 'text-gray-900'}>Download result:</strong>
                <span className="ml-1">Preview the before/after comparison and download your optimized image with significant file size reduction.</span>
              </div>
            </li>
          </ol>
        </section>

        {/* Tips for Etsy and Shopee Sellers Section */}
        <section id="tips" className="max-w-2xl mx-auto px-4 pt-24 pb-12">
          <h2 className={`text-2xl font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Tips for Etsy and Shopee Sellers
          </h2>
          <p className={`leading-relaxed mb-4 ${
            darkMode ? 'text-gray-300' : 'text-slate-600'
          }`}>
            Online marketplace sellers often struggle with image upload limits and slow-loading product pages. Here's how our compression tool addresses these common frustrations:
          </p>
          <p className={`leading-relaxed mb-4 ${
            darkMode ? 'text-gray-300' : 'text-slate-600'
          }`}>
            <strong className={darkMode ? 'text-white' : 'text-gray-900'}>Etsy sellers</strong> know the frustration of hitting the platform's file size recommendations. Images over 500KB can slow down your shop and hurt mobile performance. Our Etsy preset automatically optimizes your product photos to stay under this limit while maintaining the visual quality that showcases your products effectively.
          </p>
          <p className={`leading-relaxed mb-4 ${
            darkMode ? 'text-gray-300' : 'text-slate-600'
          }`}>
            <strong className={darkMode ? 'text-white' : 'text-gray-900'}>Shopee sellers</strong> face similar challenges with the 2MB upload limit. Large product images can cause listing failures or poor mobile experience. The Shopee preset ensures your images meet platform requirements while loading quickly for potential buyers browsing on mobile devices.
          </p>
          <p className={`leading-relaxed ${
            darkMode ? 'text-gray-300' : 'text-slate-600'
          }`}>
            <strong className={darkMode ? 'text-white' : 'text-gray-900'}>Professional tip:</strong> Faster-loading images improve your search ranking on both platforms. Compressed images also reduce bandwidth costs for your customers, leading to better user experience and potentially higher conversion rates.
          </p>
        </section>

        {/* About Section */}
        <section id="about" className="max-w-2xl mx-auto px-4 pt-24 pb-12">
          <h2 className={`text-2xl font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            About Easy Image Compress
          </h2>
          <p className={`leading-relaxed mb-4 ${
            darkMode ? 'text-gray-300' : 'text-slate-600'
          }`}>
            Easy Image Compress is a professional-grade image optimization tool designed specifically for e-commerce sellers, content creators, and digital marketers. Built with privacy and performance in mind, our tool processes all images directly in your browser without uploading files to external servers.
          </p>
          <p className={`leading-relaxed mb-4 ${
            darkMode ? 'text-gray-300' : 'text-slate-600'
          }`}>
            We understand the unique challenges faced by online sellers who need to balance image quality with file size constraints across different platforms. That's why we've created platform-specific presets that take the guesswork out of image optimization.
          </p>
          <p className={`leading-relaxed ${
            darkMode ? 'text-gray-300' : 'text-slate-600'
          }`}>
            <strong className={darkMode ? 'text-white' : 'text-gray-900'}>Privacy Policy:</strong> We respect your privacy. All image processing happens locally in your browser. No images, personal data, or usage information is transmitted to our servers or third parties. For questions or support, contact us at info@codedcheese.com.
          </p>
        </section>
      </div>

      {/* Footer */}
      <footer className={`mt-16 py-8 border-t ${
        darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className={`text-sm ${
            darkMode ? 'text-gray-400' : 'text-slate-500'
          }`}>
            © 2025 Easy Image Compress. Made with ❤️ by{' '}
            <a 
              href="https://www.codedcheese.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 transition-colors"
            >
              Coded Cheese
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;