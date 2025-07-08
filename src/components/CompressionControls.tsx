import React from 'react';
import { Settings, Zap, Ruler, AlertCircle } from 'lucide-react';

interface CompressionControlsProps {
  selectedPreset: string;
  onPresetChange: (preset: string) => void;
  quality: number;
  onQualityChange: (quality: number) => void;
  customWidth: number;
  customHeight: number;
  onCustomDimensionChange: (dimension: 'width' | 'height', value: string) => void;
  dimensionError: string | null;
  darkMode: boolean;
  isProcessing: boolean;
  compressedImage?: { width: number; height: number } | null;
}

const PRESETS = {
  etsy: { name: 'Etsy', description: 'Perfect for product listings', targetSize: '500KB', maxDimensions: '2000×2000' },
  shopee: { name: 'Shopee', description: 'Optimized for marketplace', targetSize: '2MB', maxDimensions: '3000×3000' },
  linkedin: { name: 'LinkedIn Banner', description: 'Professional banners', targetSize: '2MB', maxDimensions: '1584×396 (exact resize)' },
  custom: { name: 'Custom', description: 'Your own settings', targetSize: 'Variable', maxDimensions: 'User-defined' }
};

const CompressionControls: React.FC<CompressionControlsProps> = ({
  selectedPreset,
  onPresetChange,
  quality,
  onQualityChange,
  customWidth,
  customHeight,
  onCustomDimensionChange,
  dimensionError,
  darkMode,
  isProcessing,
  compressedImage
}) => {
  return (
    <div className="space-y-6">
      {/* Preset Selection */}
      <div>
        <label className={`block text-sm font-semibold mb-3 flex items-center gap-2 ${
          darkMode ? 'text-gray-200' : 'text-slate-700'
        }`}>
          <Settings className="w-4 h-4" />
          Platform Preset
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => onPresetChange(key)}
              disabled={isProcessing}
              className={`p-4 rounded-lg border-2 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedPreset === key
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : darkMode
                  ? 'border-gray-600 hover:border-gray-500 bg-gray-700/30 hover:bg-gray-700/50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
              aria-pressed={selectedPreset === key}
              aria-label={`Select ${preset.name} preset`}
            >
              <div className={`font-medium mb-1 ${
                selectedPreset === key
                  ? 'text-blue-700 dark:text-blue-300'
                  : darkMode
                  ? 'text-gray-200'
                  : 'text-slate-700'
              }`}>
                {preset.name}
              </div>
              <div className={`text-xs ${
                selectedPreset === key
                  ? 'text-blue-600 dark:text-blue-400'
                  : darkMode
                  ? 'text-gray-400'
                  : 'text-slate-500'
              }`}>
                {preset.description}
              </div>
              <div className={`text-xs mt-1 ${
                selectedPreset === key
                  ? 'text-blue-600 dark:text-blue-400'
                  : darkMode
                  ? 'text-gray-500'
                  : 'text-slate-400'
              }`}>
                Target: {preset.targetSize} • {preset.maxDimensions}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Dimensions */}
      {selectedPreset === 'custom' && (
        <div className={`p-4 rounded-lg border transition-all duration-300 ${
          darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
        }`}>
          <label className={`block text-sm font-semibold mb-3 flex items-center gap-2 ${
            darkMode ? 'text-blue-300' : 'text-blue-700'
          }`}>
            <Ruler className="w-4 h-4" />
            Custom Dimensions
          </label>
          
          <div className={`mb-4 text-sm ${
            darkMode ? 'text-gray-300' : 'text-blue-600'
          }`}>
            <p className="font-medium mb-1 flex items-center gap-2">Custom Mode Active</p>
            <p className="text-xs">Set your own maximum width and height. Images will be resized to fit within these dimensions while maintaining aspect ratio.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label 
                htmlFor="custom-width"
                className={`block text-xs font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-blue-600'
                }`}
              >
                Max Width (px)
              </label>
              <input
                id="custom-width"
                type="number"
                min="1"
                max="8000"
                value={customWidth}
                onChange={(e) => onCustomDimensionChange('width', e.target.value)}
                disabled={isProcessing}
                className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                  dimensionError
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                    : darkMode
                    ? 'border-gray-600 bg-gray-700 text-gray-200 focus:border-blue-500'
                    : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                }`}
                placeholder="1920"
                aria-label="Maximum width in pixels"
                aria-describedby={dimensionError ? "dimension-error" : undefined}
              />
            </div>
            <div>
              <label 
                htmlFor="custom-height"
                className={`block text-xs font-medium mb-2 ${
                  darkMode ? 'text-gray-300' : 'text-blue-600'
                }`}
              >
                Max Height (px)
              </label>
              <input
                id="custom-height"
                type="number"
                min="1"
                max="8000"
                value={customHeight}
                onChange={(e) => onCustomDimensionChange('height', e.target.value)}
                disabled={isProcessing}
                className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                  dimensionError
                    ? 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                    : darkMode
                    ? 'border-gray-600 bg-gray-700 text-gray-200 focus:border-blue-500'
                    : 'border-slate-300 bg-white text-slate-900 focus:border-blue-500'
                }`}
                placeholder="1080"
                aria-label="Maximum height in pixels"
                aria-describedby={dimensionError ? "dimension-error" : undefined}
              />
            </div>
          </div>
          {/* Actual output size */}
          {compressedImage && (
            <div className={`mt-3 text-xs ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}
                 aria-live="polite">
              <span className="font-medium">Actual output size: </span>
              <span>{compressedImage.width} × {compressedImage.height} px</span>
            </div>
          )}
          {/* Dimension Error */}
          {dimensionError && (
            <div 
              id="dimension-error"
              className="flex items-start gap-2 mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              role="alert"
              aria-live="polite"
            >
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 dark:text-red-300 font-medium text-sm">Invalid Dimensions</p>
                <p className="text-red-600 dark:text-red-400 text-xs">{dimensionError}</p>
              </div>
            </div>
          )}
          
          <div className={`mt-3 text-xs ${
            darkMode ? 'text-gray-400' : 'text-blue-500'
          }`}>
            <p>• Maximum allowed: 8000×8000 pixels</p>
            <p>• Enter values between 1 and 8000</p>
          </div>
        </div>
      )}
      
      {/* Preset Information */}
      {selectedPreset !== 'custom' && (
        <div className={`p-4 rounded-lg border transition-all duration-300 ${
          darkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-green-50 border-green-200'
        }`}>
          <div className={`text-sm ${
            darkMode ? 'text-gray-300' : 'text-green-700'
          }`}>
            <p className="font-medium mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {PRESETS[selectedPreset as keyof typeof PRESETS].name} Settings
            </p>
            <div className="space-y-1 text-xs">
              <p>• Target file size: {PRESETS[selectedPreset as keyof typeof PRESETS].targetSize}</p>
              <p>• Dimensions: {PRESETS[selectedPreset as keyof typeof PRESETS].maxDimensions}</p>
              {selectedPreset === 'linkedin' && (
                <p className="text-amber-600 dark:text-amber-400 font-medium">• Images will be resized to exact LinkedIn banner dimensions (1584×396)</p>
              )}
              {selectedPreset !== 'linkedin' && (
                <p>• Images will be scaled down while maintaining aspect ratio</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Processing Indicator */}
      {isProcessing && (
        <div className={`p-3 rounded-lg border ${
          darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className={`text-sm font-medium ${
              darkMode ? 'text-blue-300' : 'text-blue-700'
            }`}>
              Processing with {PRESETS[selectedPreset as keyof typeof PRESETS].name} settings...
            </span>
          </div>
        </div>
      )}
      
      {/* Quality Slider */}
      <div>
        <label 
          htmlFor="quality-slider"
          className={`block text-sm font-semibold mb-3 flex items-center gap-2 ${
            darkMode ? 'text-gray-200' : 'text-slate-700'
          }`}
        >
          <Zap className="w-4 h-4" />
          Compression Quality: {quality}%
        </label>
        <div className="space-y-3">
          <input
            id="quality-slider"
            type="range"
            min="50"
            max="95"
            value={quality}
            onChange={(e) => onQualityChange(parseInt(e.target.value))}
            disabled={isProcessing}
            className={`w-full h-3 rounded-lg appearance-none cursor-pointer slider focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              darkMode ? 'bg-gray-600' : 'bg-slate-200'
            }`}
            aria-label={`Compression quality: ${quality} percent`}
            aria-valuemin={50}
            aria-valuemax={95}
            aria-valuenow={quality}
          />
          <div className="flex justify-between items-center text-xs">
            <div className={`flex flex-col items-start ${
              darkMode ? 'text-gray-400' : 'text-slate-500'
            }`}>
              <span>50%</span>
              <span className="text-xs">Smaller file</span>
            </div>
            <div className={`text-center ${
              darkMode ? 'text-gray-300' : 'text-slate-600'
            }`}>
              <div className="font-medium">{quality}%</div>
              <div className="text-xs">
                {quality < 65 ? 'High compression' : 
                 quality < 80 ? 'Balanced' : 
                 'High quality'}
              </div>
            </div>
            <div className={`flex flex-col items-end ${
              darkMode ? 'text-gray-400' : 'text-slate-500'
            }`}>
              <span>95%</span>
              <span className="text-xs">Better quality</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompressionControls;