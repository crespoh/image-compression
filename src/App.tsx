import React, { useState, useRef } from 'react';
import { Upload, Download, Image as ImageIcon, AlertCircle, FileImage, Zap } from 'lucide-react';

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

function App() {
  const [dragActive, setDragActive] = useState(false);
  const [originalImage, setOriginalImage] = useState<ImageData | null>(null);
  const [compressedImage, setCompressedImage] = useState<CompressedImage | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Preset>('etsy');
  const [quality, setQuality] = useState(80);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      return;
    }

    try {
      const img = await loadImage(file);
      
      if (img.width > MAX_DIMENSIONS || img.height > MAX_DIMENSIONS) {
        setError(`Image dimensions must be less than ${MAX_DIMENSIONS}×${MAX_DIMENSIONS} pixels.`);
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
      
      // Auto-compress with selected preset
      setIsProcessing(true);
      const compressed = await compressImage(img, selectedPreset, quality);
      setCompressedImage(compressed);
      setIsProcessing(false);
    } catch (err) {
      setError('Failed to process image. Please try again.');
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
    if (originalImage) {
      setIsProcessing(true);
      try {
        const img = await loadImage(originalImage.file);
        const compressed = await compressImage(img, preset, quality);
        setCompressedImage(compressed);
      } catch (err) {
        setError('Failed to reprocess image.');
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
      } catch (err) {
        setError('Failed to reprocess image.');
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
    }
  };

  const resetApp = () => {
    setOriginalImage(null);
    setCompressedImage(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Image Compressor</h1>
              <p className="text-blue-100">Optimize your images for any platform</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {/* Upload Area */}
          {!originalImage && (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDrag}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-slate-100 rounded-full">
                  <Upload className="w-8 h-8 text-slate-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-700 mb-2">
                    Drop your image here
                  </p>
                  <p className="text-slate-500 mb-4">
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
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Image Processing */}
          {originalImage && (
            <div className="space-y-6">
              {/* Preset Selection */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Choose Platform Preset
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => handlePresetChange(key as Preset)}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        selectedPreset === key
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
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
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Quality: {quality}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={quality}
                  onChange={(e) => handleQualityChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Image Comparison */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Original */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <FileImage className="w-4 h-4" />
                    Original
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <img
                      src={originalImage.dataUrl}
                      alt="Original"
                      className="w-full h-48 object-contain rounded-lg bg-white"
                    />
                    <div className="mt-3 space-y-1 text-sm text-slate-600">
                      <p>Size: {formatFileSize(originalImage.size)}</p>
                      <p>Dimensions: {originalImage.width} × {originalImage.height}px</p>
                    </div>
                  </div>
                </div>

                {/* Compressed */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Compressed
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    {isProcessing ? (
                      <div className="w-full h-48 bg-slate-200 rounded-lg flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : compressedImage ? (
                      <img
                        src={compressedImage.dataUrl}
                        alt="Compressed"
                        className="w-full h-48 object-contain rounded-lg bg-white"
                      />
                    ) : null}
                    
                    {compressedImage && (
                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        <p>Size: {formatFileSize(compressedImage.size)}</p>
                        <p>Dimensions: {compressedImage.width} × {compressedImage.height}px</p>
                        <p className="text-green-600 font-medium">
                          Reduced by {Math.round(((originalImage.size - compressedImage.size) / originalImage.size) * 100)}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={downloadImage}
                  disabled={!compressedImage || isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download Compressed
                </button>
                <button
                  onClick={resetApp}
                  className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Upload New Image
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;