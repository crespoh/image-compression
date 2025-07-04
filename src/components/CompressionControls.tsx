import React from 'react';
import { Settings, Zap } from 'lucide-react';

interface CompressionControlsProps {
  selectedPreset: string;
  onPresetChange: (preset: string) => void;
  quality: number;
  onQualityChange: (quality: number) => void;
  darkMode: boolean;
  isProcessing: boolean;
}

const PRESETS = {
  etsy: { name: 'Etsy', description: 'Perfect for product listings', targetSize: '500KB', maxDimensions: '2000×2000' },
  shopee: { name: 'Shopee', description: 'Optimized for marketplace', targetSize: '2MB', maxDimensions: '3000×3000' },
  linkedin: { name: 'LinkedIn Banner', description: 'Professional banners', targetSize: '8MB', maxDimensions: '1584×396' },
  custom: { name: 'Custom', description: 'Your own settings', targetSize: '1MB', maxDimensions: '1920×1080' }
};

const CompressionControls: React.FC<CompressionControlsProps> = ({
  selectedPreset,
  onPresetChange,
  quality,
  onQualityChange,
  darkMode,
  isProcessing
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
                Target: {preset.targetSize} • Max: {preset.maxDimensions}
              </div>
            </button>
          ))}
        </div>
      </div>

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