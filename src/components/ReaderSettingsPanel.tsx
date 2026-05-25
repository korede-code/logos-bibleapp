// src/components/ReaderSettingsPanel.tsx
import React, { useState, useEffect } from 'react';
import {
  X, Sun, Moon, Type, AlignCenter, AlignLeft,
  Eye, Bold, Minus, Plus, Palette, Monitor,
  Droplet, Leaf, Coffee, Check, Link2,
  Globe, BookOpen, Crown, AlertCircle
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getTheme } from '../utils/themeUtils';

interface ReaderSettingsPanelProps {
  onClose: () => void;
}

const ReaderSettingsPanel: React.FC<ReaderSettingsPanelProps> = ({ onClose }) => {
  const { readerSettings, updateReaderSettings, isPro } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  
  const [translations, setTranslations] = useState<any[]>([]);
  const [loadingTranslations, setLoadingTranslations] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Local fallback translations in case API fails
  const fallbackTranslations = [
    { code: 'KJV', name: 'King James Version', description: 'The classic 1611 English translation', publicDomain: true, requiresPro: false },
    { code: 'ASV', name: 'American Standard Version', description: 'Early 20th-century revision of the KJV', publicDomain: true, requiresPro: false },
    { code: 'WEB', name: 'World English Bible', description: 'Modern English public domain translation', publicDomain: true, requiresPro: false },
    { code: 'YLT', name: "Young's Literal Translation", description: 'Very literal translation', publicDomain: true, requiresPro: false },
    { code: 'BBE', name: 'Bible in Basic English', description: 'Simple English using 1000 basic words', publicDomain: true, requiresPro: false },
    { code: 'NIV', name: 'New International Version', description: 'Most popular modern translation', publicDomain: false, requiresPro: true },
    { code: 'NLT', name: 'New Living Translation', description: 'Easy to read modern translation', publicDomain: false, requiresPro: true },
    { code: 'ESV', name: 'English Standard Version', description: 'Essentially literal translation', publicDomain: false, requiresPro: true },
  ];

  useEffect(() => {
    loadTranslations();
  }, []);

  const loadTranslations = async () => {
    setLoadingTranslations(true);
    setTranslationError(null);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/bible/translations`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success && data.translations) {
        setTranslations(data.translations);
      } else {
        // Use fallback translations
        console.warn('Using fallback translations');
        setTranslations(fallbackTranslations);
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
      setTranslationError('Could not load translations. Using defaults.');
      // Use fallback translations
      setTranslations(fallbackTranslations);
    } finally {
      setLoadingTranslations(false);
    }
  };

  const themes = [
    { id: 'classic', name: 'Classic', icon: <Sun size={16} />, bg: '#F5F0E8' },
    { id: 'sepia', name: 'Sepia', icon: <Coffee size={16} />, bg: '#F4ECD8' },
    { id: 'dark', name: 'Dark', icon: <Moon size={16} />, bg: '#1A1A2E' },
    { id: 'pure-black', name: 'Pure Black', icon: <Monitor size={16} />, bg: '#000000' },
    { id: 'nature', name: 'Nature', icon: <Leaf size={16} />, bg: '#1a3a1a' },
    { id: 'ocean', name: 'Ocean', icon: <Droplet size={16} />, bg: '#0a2a3a' },
  ];

  const fontFamilies = [
    { id: 'Crimson Pro', name: 'Crimson Pro', category: 'Serif' },
    { id: 'EB Garamond', name: 'EB Garamond', category: 'Serif' },
    { id: 'Lora', name: 'Lora', category: 'Serif' },
    { id: 'Merriweather', name: 'Merriweather', category: 'Serif' },
    { id: 'Inter', name: 'Inter', category: 'Sans-serif' },
    { id: 'Playfair Display', name: 'Playfair Display', category: 'Serif' },
  ];

  const lineSpacingOptions = [1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.5];
  const marginWidths = [0, 8, 16, 24, 32, 48, 64];

  const currentFontSize = readerSettings.fontSize || 20;
  const currentLineSpacing = readerSettings.lineSpacing || 1.8;
  const currentMargin = readerSettings.marginWidth || 24;

  const getFontSizeLabel = (size: number) => {
    if (size <= 14) return 'Small';
    if (size <= 18) return 'Normal';
    if (size <= 24) return 'Large';
    return 'X-Large';
  };

  const getLineSpacingLabel = (spacing: number) => {
    if (spacing <= 1.4) return 'Compact';
    if (spacing <= 1.8) return 'Normal';
    return 'Relaxed';
  };

  const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: theme.textMuted }}>
        {title}
      </h3>
      {children}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl overflow-hidden animate-slide-up"
        style={{ backgroundColor: theme.card }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <Palette size={18} style={{ color: theme.accent }} />
            <h2 className="text-lg font-bold" style={{ color: theme.text }}>Reader Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80"
            style={{ backgroundColor: theme.surface }}
          >
            <X size={16} style={{ color: theme.textMuted }} />
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          
          {/* Theme Selection */}
          <SettingSection title="Theme">
            <div className="grid grid-cols-3 gap-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => updateReaderSettings({ theme: t.id as any })}
                  className={`p-3 rounded-xl text-center transition-all ${
                    readerSettings.theme === t.id ? 'ring-2' : ''
                  }`}
                  style={{
                    backgroundColor: t.bg,
                    ringColor: readerSettings.theme === t.id ? theme.accent : 'transparent',
                    border: `1px solid ${readerSettings.theme === t.id ? theme.accent : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  <div className="flex items-center justify-center mb-1">
                    {React.cloneElement(t.icon, { size: 18, style: { color: readerSettings.theme === t.id ? theme.accent : '#888' } })}
                  </div>
                  <span className="text-xs font-medium" style={{ color: '#fff' }}>
                    {t.name}
                  </span>
                  {readerSettings.theme === t.id && (
                    <Check size={12} className="mx-auto mt-1" style={{ color: theme.accent }} />
                  )}
                </button>
              ))}
            </div>
          </SettingSection>

          {/* Font Family */}
          <SettingSection title="Font Family">
            <div className="flex flex-wrap gap-2">
              {fontFamilies.map((font) => (
                <button
                  key={font.id}
                  onClick={() => updateReaderSettings({ fontFamily: font.id as any })}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                    readerSettings.fontFamily === font.id ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor: readerSettings.fontFamily === font.id ? theme.accent : theme.surface,
                    color: readerSettings.fontFamily === font.id ? 'white' : theme.textMuted,
                    border: `1px solid ${readerSettings.fontFamily === font.id ? 'transparent' : theme.border}`,
                    fontFamily: font.id,
                  }}
                >
                  {font.name}
                </button>
              ))}
            </div>
          </SettingSection>

          {/* Font Size */}
          <SettingSection title="Font Size">
            <div className="flex items-center gap-4">
              <button
                onClick={() => updateReaderSettings({ fontSize: Math.max(14, currentFontSize - 2) })}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
              >
                <Minus size={16} style={{ color: theme.text }} />
              </button>
              <div className="flex-1 text-center">
                <span className="text-xl font-bold" style={{ color: theme.text }}>
                  {currentFontSize}px
                </span>
                <div className="mt-1" style={{ fontFamily: readerSettings.fontFamily, fontSize: `${currentFontSize}px`, color: theme.accent }}>
                  Aa
                </div>
              </div>
              <button
                onClick={() => updateReaderSettings({ fontSize: Math.min(32, currentFontSize + 2) })}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
              >
                <Plus size={16} style={{ color: theme.text }} />
              </button>
            </div>
            <div className="mt-3">
              <input
                type="range"
                min="14"
                max="32"
                step="1"
                value={currentFontSize}
                onChange={(e) => updateReaderSettings({ fontSize: parseInt(e.target.value) })}
                className="w-full"
                style={{ accentColor: theme.accent }}
              />
            </div>
          </SettingSection>

          {/* Line Spacing */}
          <SettingSection title="Line Spacing">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const idx = lineSpacingOptions.indexOf(currentLineSpacing);
                  if (idx > 0) updateReaderSettings({ lineSpacing: lineSpacingOptions[idx - 1] });
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
              >
                <Minus size={16} style={{ color: theme.text }} />
              </button>
              <div className="flex-1 text-center">
                <span className="text-lg font-bold" style={{ color: theme.text }}>
                  {currentLineSpacing}
                </span>
                <div className="flex justify-center gap-0.5 mt-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-1 rounded-full mx-px" style={{ height: `${6 * i}px`, backgroundColor: theme.accent, opacity: 0.5 + (i * 0.2) }} />
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  const idx = lineSpacingOptions.indexOf(currentLineSpacing);
                  if (idx < lineSpacingOptions.length - 1) updateReaderSettings({ lineSpacing: lineSpacingOptions[idx + 1] });
                }}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all"
                style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
              >
                <Plus size={16} style={{ color: theme.text }} />
              </button>
            </div>
            <div className="mt-3">
              <input
                type="range"
                min="1.2"
                max="2.5"
                step="0.1"
                value={currentLineSpacing}
                onChange={(e) => updateReaderSettings({ lineSpacing: parseFloat(e.target.value) })}
                className="w-full"
                style={{ accentColor: theme.accent }}
              />
            </div>
          </SettingSection>

          {/* Margins */}
          <SettingSection title="Margins">
            <div className="flex flex-wrap gap-2">
              {marginWidths.map((width) => (
                <button
                  key={width}
                  onClick={() => updateReaderSettings({ marginWidth: width })}
                  className={`px-3 py-2 rounded-lg text-xs transition-all flex-1 ${
                    currentMargin === width ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor: currentMargin === width ? theme.accent : theme.surface,
                    color: currentMargin === width ? 'white' : theme.textMuted,
                    border: `1px solid ${currentMargin === width ? 'transparent' : theme.border}`,
                  }}
                >
                  {width === 0 ? 'Narrow' : width === 64 ? 'Wide' : `${width}px`}
                </button>
              ))}
            </div>
          </SettingSection>

          {/* Bible Translation Section */}
          <SettingSection title="Bible Translation">
            {loadingTranslations ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: theme.accent }} />
              </div>
            ) : translationError && (
              <div className="mb-3 p-2 rounded-lg text-xs flex items-center gap-2" style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>
                <AlertCircle size={12} />
                {translationError}
              </div>
            )}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {translations.map((t) => (
                <button
                  key={t.code}
                  onClick={() => {
                    if (t.requiresPro && !isPro) {
                      const toast = document.createElement('div');
                      toast.textContent = 'This translation requires a Pro subscription. Upgrade to access.';
                      toast.style.cssText = `
                        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
                        background: #f59e0b; color: white; padding: 10px 20px;
                        border-radius: 10px; z-index: 1000; font-size: 14px;
                      `;
                      document.body.appendChild(toast);
                      setTimeout(() => toast.remove(), 3000);
                      return;
                    }
                    updateReaderSettings({ translation: t.code });
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                    readerSettings.translation === t.code ? 'ring-2' : ''
                  }`}
                  style={{
                    backgroundColor: readerSettings.translation === t.code ? `${theme.accent}15` : theme.surface,
                    border: `1px solid ${readerSettings.translation === t.code ? theme.accent : theme.border}`,
                    opacity: t.requiresPro && !isPro ? 0.6 : 1,
                  }}
                  disabled={t.requiresPro && !isPro}
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm" style={{ color: theme.text }}>{t.name}</span>
                      {t.requiresPro && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.accent, color: 'white' }}>
                          PRO
                        </span>
                      )}
                      {t.publicDomain && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.surface, color: theme.textMuted }}>
                          Free
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{t.description}</p>
                  </div>
                  {readerSettings.translation === t.code && (
                    <Check size={16} style={{ color: theme.accent }} />
                  )}
                </button>
              ))}
            </div>
          </SettingSection>

          {/* Display Options */}
          <SettingSection title="Display Options">
            <div className="space-y-2">
              <button
                onClick={() => updateReaderSettings({ showVerseNumbers: !readerSettings.showVerseNumbers })}
                className="w-full flex items-center justify-between p-3 rounded-xl transition-all"
                style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
              >
                <div className="flex items-center gap-3">
                  <Type size={16} style={{ color: theme.accent }} />
                  <span className="text-sm" style={{ color: theme.text }}>Show Verse Numbers</span>
                </div>
                <div className={`w-8 h-5 rounded-full transition-all ${readerSettings.showVerseNumbers ? 'bg-amber-500' : 'bg-gray-600'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-all mt-0.5 ${readerSettings.showVerseNumbers ? 'ml-4' : 'ml-0.5'}`} />
                </div>
              </button>

              <button
                onClick={() => updateReaderSettings({ redLetterText: !readerSettings.redLetterText })}
                className="w-full flex items-center justify-between p-3 rounded-xl transition-all"
                style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
              >
                <div className="flex items-center gap-3">
                  <Bold size={16} style={{ color: theme.accent }} />
                  <span className="text-sm" style={{ color: theme.text }}>Red Letter Text</span>
                </div>
                <div className={`w-8 h-5 rounded-full transition-all ${readerSettings.redLetterText ? 'bg-amber-500' : 'bg-gray-600'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-all mt-0.5 ${readerSettings.redLetterText ? 'ml-4' : 'ml-0.5'}`} />
                </div>
              </button>

              <button
                onClick={() => updateReaderSettings({ showCrossReferences: !readerSettings.showCrossReferences })}
                className="w-full flex items-center justify-between p-3 rounded-xl transition-all"
                style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
              >
                <div className="flex items-center gap-3">
                  <Link2 size={16} style={{ color: theme.accent }} />
                  <span className="text-sm" style={{ color: theme.text }}>Show Cross References</span>
                </div>
                <div className={`w-8 h-5 rounded-full transition-all ${readerSettings.showCrossReferences ? 'bg-amber-500' : 'bg-gray-600'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-all mt-0.5 ${readerSettings.showCrossReferences ? 'ml-4' : 'ml-0.5'}`} />
                </div>
              </button>
            </div>
          </SettingSection>

          {/* Preview */}
          <SettingSection title="Preview">
            <div className="p-4 rounded-xl text-center" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
              <p className="text-sm leading-relaxed" style={{ fontFamily: readerSettings.fontFamily, fontSize: `${currentFontSize - 4}px`, lineHeight: currentLineSpacing, color: theme.text }}>
                "For God so loved the world, that he gave his only begotten Son..."
              </p>
              <p className="text-xs mt-2" style={{ color: theme.accent }}>
                John 3:16 · {readerSettings.translation}
              </p>
            </div>
          </SettingSection>
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: theme.border }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
            style={{ backgroundColor: theme.accent, color: 'white' }}
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReaderSettingsPanel;