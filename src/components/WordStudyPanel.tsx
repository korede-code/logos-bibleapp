// src/components/WordStudyPanel.tsx
import React, { useState } from 'react';
import { X, BookOpen, Search, Lightbulb } from 'lucide-react';
import { searchBibleWords, getVerseCommentary, getPopularWords } from '../services/wordStudy';
import { useAppStore } from '../store/appStore';
import { BIBLE_BOOKS } from '../data/bibleData';

interface WordStudyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVerse?: string;
  theme: any;
}

const WordStudyPanel: React.FC<WordStudyPanelProps> = ({ isOpen, onClose, selectedVerse, theme }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [commentary, setCommentary] = useState<string | null>(null);
  const { navigate, setReadingPosition } = useAppStore();

  // Initialize commentary
  useState(() => {
    if (selectedVerse) {
      const comm = getVerseCommentary(selectedVerse);
      setCommentary(comm);
    }
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length >= 2) {
      setResults(searchBibleWords(query));
    } else {
      setResults([]);
    }
  };

  // Navigate to a verse reference
  const navigateToVerse = (reference: string) => {
    try {
      // Parse reference like "John 3:16" or "Ephesians 2:8"
      const parts = reference.split(' ');
      const versePart = parts[parts.length - 1]; // "3:16"
      const bookName = parts.slice(0, -1).join(' '); // "John" or "1 Corinthians"
      const [chapter, verse] = versePart.split(':');

      const book = BIBLE_BOOKS.find(b => 
        b.name === bookName || b.shortName === bookName
      );

      if (book && chapter && verse) {
        setReadingPosition({
          book: book.name,
          bookId: book.id,
          chapter: parseInt(chapter),
          verse: parseInt(verse) || 1,
        });
        onClose();
        navigate('reader');
      }
    } catch (e) {
      console.error('Navigation error:', e);
    }
  };

  if (!isOpen) return null;

  const popularWords = getPopularWords();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div 
        className="w-full max-w-lg rounded-t-3xl p-6 pb-10 max-h-[80vh] overflow-y-auto"
        style={{ backgroundColor: theme.card }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg" style={{ color: theme.text }}>Word Study</h3>
          <button onClick={onClose} style={{ color: theme.textMuted }}><X size={20} /></button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
          <Search size={16} style={{ color: theme.textMuted }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search word meanings (love, grace, faith...)"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: theme.text }}
          />
        </div>

        {/* Verse Commentary */}
        {commentary && (
          <div className="mb-4 p-4 rounded-xl" style={{ backgroundColor: `${theme.accent}10`, border: `1px solid ${theme.accent}30` }}>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={14} style={{ color: theme.accent }} />
              <span className="text-xs font-bold" style={{ color: theme.accent }}>{selectedVerse}</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: theme.text }}>{commentary}</p>
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div className="space-y-3 mb-4">
            {results.map((word, i) => (
              <div key={i} className="p-4 rounded-xl" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={16} style={{ color: theme.accent }} />
                  <h4 className="font-bold text-sm" style={{ color: theme.text }}>{word.word}</h4>
                </div>
                <p className="text-sm mb-2" style={{ color: theme.text }}>{word.meaning}</p>
                <p className="text-xs mb-1" style={{ color: theme.textMuted }}>
                  <span className="font-medium">Origin:</span> {word.origin}
                </p>
                <p className="text-xs mb-2" style={{ color: theme.textMuted }}>
                  <span className="font-medium">Usage:</span> {word.usage}
                </p>
                {/* ✅ Clickable verse references */}
                <div className="flex flex-wrap gap-1">
                  {word.references.map((ref: string) => (
                    <button
                      key={ref}
                      onClick={() => navigateToVerse(ref)}
                      className="text-xs px-2 py-0.5 rounded-full transition-all hover:opacity-80 hover:scale-105"
                      style={{ backgroundColor: `${theme.accent}15`, color: theme.accent, cursor: 'pointer' }}
                    >
                      {ref}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Popular Words */}
        {!searchQuery && results.length === 0 && (
          <div>
            <p className="text-xs font-medium mb-3" style={{ color: theme.textMuted }}>Popular Word Studies</p>
            <div className="grid grid-cols-2 gap-2">
              {popularWords.map((word, i) => (
                <button
                  key={i}
                  onClick={() => handleSearch(word.word)}
                  className="p-3 rounded-xl text-left transition-all hover:opacity-80"
                  style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb size={14} style={{ color: theme.accent }} />
                    <span className="font-bold text-sm" style={{ color: theme.text }}>{word.word}</span>
                  </div>
                  <p className="text-xs truncate" style={{ color: theme.textMuted }}>{word.meaning}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-center mt-4" style={{ color: theme.textFaint }}>
          Tap a verse reference to navigate
        </p>
      </div>
    </div>
  );
};

export default WordStudyPanel;