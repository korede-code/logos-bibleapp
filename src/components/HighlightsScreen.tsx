// src/components/HighlightsScreen.tsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, Trash2, ChevronRight, Search, X } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getTheme } from '../utils/themeUtils';
import { BIBLE_BOOKS } from '../data/bibleData';

const HIGHLIGHT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  yellow: { bg: '#FEF08A40', border: '#EAB308', text: '#854D0E' },
  green: { bg: '#BBF7D040', border: '#22C55E', text: '#166534' },
  blue: { bg: '#BFDBFE40', border: '#3B82F6', text: '#1E40AF' },
  pink: { bg: '#FBCFE840', border: '#EC4899', text: '#9D174D' },
  purple: { bg: '#E9D5FF40', border: '#A855F7', text: '#6B21A8' },
  orange: { bg: '#FED7AA40', border: '#F97316', text: '#9A3412' },
};

const HighlightsScreen: React.FC = () => {
  const { readerSettings, navigate, highlights, removeHighlight, setReadingPosition } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  const [filterColor, setFilterColor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [verseTexts, setVerseTexts] = useState<Record<string, string>>({});

  // Fetch verse text for each highlight
  useEffect(() => {
    const fetchVerseTexts = async () => {
      const texts: Record<string, string> = {};
      
      for (const highlight of highlights) {
        const key = `${highlight.bookId}:${highlight.chapter}:${highlight.verse}`;
        
        if (!verseTexts[key]) {
          try {
            const response = await fetch(
              `https://logos-daily-backend.onrender.com/api/bible/${encodeURIComponent(highlight.book)}/${highlight.chapter}?translation=kjv`
            );
            const data = await response.json();
            
            if (data.success && data.data) {
              const verse = data.data.find((v: any) => v.verse === highlight.verse);
              if (verse) {
                texts[key] = verse.text;
              }
            }
          } catch (e) {
            console.error('Failed to fetch verse text:', e);
          }
        }
      }
      
      setVerseTexts(prev => ({ ...prev, ...texts }));
    };

    if (highlights.length > 0) {
      fetchVerseTexts();
    }
  }, [highlights.length]);

  // Filter highlights by color and search
  const filteredHighlights = highlights.filter(h => {
    const matchesColor = !filterColor || h.color === filterColor;
    const matchesSearch = !searchQuery || 
      h.book.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${h.chapter}:${h.verse}`.includes(searchQuery);
    return matchesColor && matchesSearch;
  });

  // Group highlights by book
  const groupedHighlights = filteredHighlights.reduce((acc, h) => {
    if (!acc[h.book]) acc[h.book] = [];
    acc[h.book].push(h);
    return acc;
  }, {} as Record<string, typeof highlights>);

  const navigateToVerse = (highlight: typeof highlights[0]) => {
    setReadingPosition({
      book: highlight.book,
      bookId: highlight.bookId,
      chapter: highlight.chapter,
      verse: highlight.verse,
    });
    navigate('reader');
  };

  const getVerseText = (highlight: typeof highlights[0]): string => {
    const key = `${highlight.bookId}:${highlight.chapter}:${highlight.verse}`;
    return verseTexts[key] || 'Loading verse...';
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('home')} style={{ color: theme.textMuted }}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif' }}>
            Highlights
          </h1>
          <span className="text-xs font-medium ml-auto px-2 py-1 rounded-full" style={{ backgroundColor: theme.surface, color: theme.textMuted }}>
            {filteredHighlights.length} of {highlights.length}
          </span>
        </div>

        {/* Search Bar */}
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
          <Search size={16} style={{ color: theme.textMuted }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by book, chapter, or verse..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: theme.text }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ color: theme.textMuted }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Color Filter */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterColor(null)}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-all flex-shrink-0"
            style={{
              backgroundColor: !filterColor ? theme.accent : theme.surface,
              color: !filterColor ? 'white' : theme.textMuted,
              border: `1px solid ${!filterColor ? theme.accent : theme.border}`,
            }}
          >
            All Colors
          </button>
          {Object.entries(HIGHLIGHT_COLORS).map(([color, style]) => (
            <button
              key={color}
              onClick={() => setFilterColor(color)}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-all flex-shrink-0 flex items-center gap-1.5"
              style={{
                backgroundColor: filterColor === color ? theme.accent : theme.surface,
                color: filterColor === color ? 'white' : theme.textMuted,
                border: `1px solid ${filterColor === color ? theme.accent : theme.border}`,
              }}
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: style.border }} />
              {color}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {Object.keys(groupedHighlights).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Star size={48} style={{ color: theme.textFaint }} />
            <h3 className="text-lg font-bold mt-4 mb-2" style={{ color: theme.text }}>
              {searchQuery ? 'No matches found' : 'No Highlights Yet'}
            </h3>
            <p className="text-sm" style={{ color: theme.textMuted }}>
              {searchQuery ? 'Try a different search term' : 'Select verses in the reader and tap "Highlight" to save them here.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => navigate('reader')}
                className="mt-4 px-6 py-2.5 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: theme.accent, color: 'white' }}
              >
                Go to Reader
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedHighlights).map(([book, bookHighlights]) => (
              <div key={book}>
                <h2 className="text-xs font-bold uppercase tracking-widest mb-2 px-1" style={{ color: theme.textMuted }}>
                  {book} ({bookHighlights.length})
                </h2>
                <div className="space-y-2">
                  {bookHighlights.map(highlight => (
                    <div
                      key={highlight.id}
                      className="rounded-xl overflow-hidden"
                      style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
                    >
                      <button
                        onClick={() => navigateToVerse(highlight)}
                        className="w-full text-left p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0"
                            style={{ backgroundColor: HIGHLIGHT_COLORS[highlight.color]?.border || '#EAB308' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold" style={{ color: theme.accent }}>
                                {highlight.book} {highlight.chapter}:{highlight.verse}
                              </span>
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-full"
                                style={{ 
                                  backgroundColor: `${HIGHLIGHT_COLORS[highlight.color]?.border}20`, 
                                  color: HIGHLIGHT_COLORS[highlight.color]?.border 
                                }}
                              >
                                {highlight.style === 'underline' ? 'Underline' : 'Highlight'}
                              </span>
                            </div>
                            {/* ✅ Actual verse text */}
                            <div
                              className="text-sm leading-relaxed p-3 rounded-lg"
                              style={{
                                backgroundColor: HIGHLIGHT_COLORS[highlight.color]?.bg || '#FEF08A40',
                                color: theme.text,
                                borderLeft: highlight.style === 'underline' 
                                  ? `3px solid ${HIGHLIGHT_COLORS[highlight.color]?.border}` 
                                  : 'none',
                                fontStyle: 'italic',
                              }}
                            >
                              "{getVerseText(highlight)}"
                            </div>
                          </div>
                          <ChevronRight size={14} className="flex-shrink-0 mt-1" style={{ color: theme.textFaint }} />
                        </div>
                      </button>
                      
                      {/* Delete button */}
                      <div className="px-4 pb-3 flex justify-end">
                        {confirmDelete === highlight.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: theme.textMuted }}>Delete?</span>
                            <button
                              onClick={() => {
                                removeHighlight(highlight.id);
                                setConfirmDelete(null);
                              }}
                              className="text-xs px-2 py-1 rounded-lg font-medium"
                              style={{ backgroundColor: '#e53935', color: 'white' }}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="text-xs px-2 py-1 rounded-lg"
                              style={{ backgroundColor: theme.surface, color: theme.text }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(highlight.id)}
                            className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg"
                            style={{ color: theme.textFaint }}
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="h-20" />
      </div>
    </div>
  );
};

export default HighlightsScreen;