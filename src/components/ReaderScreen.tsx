/**
 * Logos Daily — Bible Reader Screen
 * ====================================
 * The core reading experience featuring:
 * - Multiple view modes (scroll, parallel, verse-comparison)
 * - Verse selection and annotation toolbar
 * - Cross-reference and footnote panels
 * - Focus mode with chrome-free reading
 * - Chapter navigation
 * - Verse navigation
 * - Red letter text support
 * - Quick book navigation (floating button + modal)
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Settings2, Bookmark, Download, HardDrive,
  X, BookOpen, ArrowLeft,
  Columns, AlignJustify, Eye, EyeOff, Link2, MessageSquare,
  WifiOff, RefreshCw, Search
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useBibleChapter } from '../hooks/useRealBibleData';
import { BIBLE_BOOKS, CROSS_REFERENCES } from '../data/bibleData';
import { getTheme, HIGHLIGHT_COLORS } from '../utils/themeUtils';
import AnnotationToolbar from './AnnotationToolbar';
import ReaderSettingsPanel from './ReaderSettingsPanel';
import BookNavigator from './BookNavigator';
import { offlineStorage } from '../services/offlineStorage';

// ─── Red Letter Words/Phrases (from Jesus' direct speech) ─────────────────────

const isRedLetterVerse = (book: string, chapter: number, verse: number): boolean => {
  const gospels = ['Matthew', 'Mark', 'Luke', 'John'];
  if (!gospels.includes(book)) return false;
  const redLetterMap: Record<string, number[]> = {
    'John:3': [3,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,21],
    'Matthew:5': [3,4,5,6,7,8,9,10,11,12,13,14,16],
    'Matthew:6': [25,26,27,28,29,30,31,32,33,34],
    'John:14': [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21],
    'John:15': [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17],
  };
  const key = `${book}:${chapter}`;
  return redLetterMap[key]?.includes(verse) ?? false;
};

// All books list for quick navigation
const ALL_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
  '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job',
  'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah',
  'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai',
  'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];

// ─── Floating Book Button Component ─────────────────────────────────────────

const FloatingBookButton: React.FC<{ 
  onPress: () => void; 
  theme: any; 
  visible: boolean 
}> = ({ onPress, theme, visible }) => {
  if (!visible) return null;

  return (
    <div
      className="fixed bottom-24 right-5 z-50 transition-all duration-300"
      style={{
        transform: visible ? 'scale(1)' : 'scale(0)',
        opacity: visible ? 1 : 0,
      }}
    >
      <button
        onClick={onPress}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
        style={{
          backgroundColor: theme.accent,
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        }}
        aria-label="Quick book navigation"
      >
        <span className="text-2xl">📖</span>
      </button>
    </div>
  );
};

// ─── Quick Book Navigator Modal ──────────────────────────────────────────────

const BookQuickNavigator: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelectBook: (book: string) => void;
  currentBook: string;
  theme: any;
}> = ({ visible, onClose, onSelectBook, currentBook, theme }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBooks = ALL_BOOKS.filter(book =>
    book.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!visible) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl flex flex-col"
        style={{ 
          backgroundColor: theme.card, 
          maxHeight: '80vh',
          animation: 'slideUp 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: theme.border }}>
          <h2 className="text-lg font-bold text-center" style={{ color: theme.text }}>
            Quick Navigation
          </h2>
          <p className="text-xs text-center mt-1" style={{ color: theme.textMuted }}>
            Jump to any book
          </p>
        </div>

        {/* Search Input */}
        <div className="p-4">
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
          >
            <Search size={16} style={{ color: theme.textMuted }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a book..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: theme.text }}
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ color: theme.textMuted }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Books List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {filteredBooks.map(book => (
              <button
                key={book}
                onClick={() => {
                  onSelectBook(book);
                  onClose();
                }}
                className="px-4 py-2.5 rounded-full text-sm font-medium transition-all hover:opacity-80"
                style={{
                  backgroundColor: book === currentBook ? theme.accent : theme.surface,
                  color: book === currentBook ? 'white' : theme.text,
                  border: `1px solid ${book === currentBook ? theme.accent : theme.border}`,
                }}
              >
                {book}
              </button>
            ))}
            {filteredBooks.length === 0 && (
              <p className="text-sm text-center w-full py-8" style={{ color: theme.textMuted }}>
                No books found
              </p>
            )}
          </div>
        </div>

        {/* Close Button */}
        <div className="p-4 border-t" style={{ borderColor: theme.border }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80"
            style={{ backgroundColor: theme.surface, color: theme.textMuted, border: `1px solid ${theme.border}` }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Chapter Navigator Component ─────────────────────────────────────────────

const ChapterNavigator: React.FC<{
  currentBook: any;
  currentChapter: number;
  onChapterChange: (chapter: number) => void;
  onClose: () => void;
  theme: any;
}> = ({ currentBook, currentChapter, onChapterChange, onClose, theme }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.border }}>
          <h3 className="font-bold" style={{ color: theme.text }}>Select Chapter</h3>
          <button onClick={onClose} style={{ color: theme.textMuted }}>✕</button>
        </div>
        
        <div className="p-4">
          <div className="text-center mb-4">
            <p className="text-sm font-medium" style={{ color: theme.accent }}>{currentBook?.name}</p>
            <p className="text-xs" style={{ color: theme.textMuted }}>Chapters 1 - {currentBook?.chapters}</p>
          </div>
          
          <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
            {Array.from({ length: currentBook?.chapters || 50 }, (_, i) => i + 1).map(ch => (
              <button
                key={ch}
                onClick={() => {
                  onChapterChange(ch);
                  onClose();
                }}
                className="py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: ch === currentChapter ? theme.accent : theme.surface,
                  color: ch === currentChapter ? 'white' : theme.text,
                  border: `1px solid ${theme.border}`,
                }}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Verse Navigator Component ───────────────────────────────────────────────

const VerseNavigator: React.FC<{
  currentChapter: number;
  totalVerses: number;
  currentVerse: number;
  onVerseChange: (verse: number) => void;
  onClose: () => void;
  theme: any;
}> = ({ currentChapter, totalVerses, currentVerse, onVerseChange, onClose, theme }) => {
  if (totalVerses === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
        <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: theme.card }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3" style={{ borderColor: theme.accent }} />
          <p className="text-sm" style={{ color: theme.text }}>Loading chapter...</p>
        </div>
      </div>
    );
  }

  const verseGroups = Array.from({ length: Math.ceil(totalVerses / 10) }, (_, i) => {
    const start = i * 10 + 1;
    const end = Math.min(start + 9, totalVerses);
    return Array.from({ length: end - start + 1 }, (_, j) => start + j);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.border }}>
          <h3 className="font-bold" style={{ color: theme.text }}>Select Verse</h3>
          <button onClick={onClose} style={{ color: theme.textMuted }}>✕</button>
        </div>
        <div className="p-4">
          <div className="text-center mb-4">
            <p className="text-sm font-medium" style={{ color: theme.accent }}>Chapter {currentChapter}</p>
            <p className="text-xs" style={{ color: theme.textMuted }}>{totalVerses} verses</p>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {verseGroups.map((group, idx) => (
              <div key={idx} className="flex gap-2 justify-center flex-wrap">
                {group.map(verse => (
                  <button
                    key={verse}
                    onClick={() => {
                      onVerseChange(verse);
                      onClose();
                    }}
                    className="w-10 h-10 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: verse === currentVerse ? theme.accent : theme.surface,
                      color: verse === currentVerse ? 'white' : theme.text,
                      border: `1px solid ${theme.border}`,
                    }}
                  >
                    {verse}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Verse Render Component ───────────────────────────────────────────────────

interface VerseTextProps {
  verse: {
    verse: number;
    text: string;
    book: string;
    bookId: number;
    chapter: number;
    translation?: string;
  };
  highlights: ReturnType<typeof useAppStore.getState>['highlights'];
  selectedVerses: string[];
  onSelect: (key: string) => void;
  onDeselect: (key: string) => void;
  showVerseNumbers: boolean;
  redLetterText: boolean;
  theme: ReturnType<typeof getTheme>;
  fontFamily: string;
  fontSize: number;
  lineSpacing: number;
  showCrossRef: boolean;
  crossRefs: string[];
  onCrossRefTap: (ref: string) => void;
}

const VerseText: React.FC<VerseTextProps> = ({
  verse, highlights, selectedVerses, onSelect, onDeselect,
  showVerseNumbers, redLetterText, theme, fontFamily, fontSize,
  lineSpacing, showCrossRef, crossRefs, onCrossRefTap
}) => {
  const verseKey = `${verse.bookId}:${verse.chapter}:${verse.verse}`;
  const isSelected = selectedVerses.includes(verseKey);
  const highlight = highlights.find(h =>
    h.bookId === verse.bookId && h.chapter === verse.chapter && h.verse === verse.verse
  );
  const highlightColor = highlight ? HIGHLIGHT_COLORS[highlight.color] : null;
  const isRedLetter = redLetterText && isRedLetterVerse(verse.book, verse.chapter, verse.verse);
  const refKey = `${verse.book} ${verse.chapter}:${verse.verse}`;
  const verseRefs = crossRefs;

  return (
    <div
      id={`verse-${verse.verse}`}
      className="group mb-4 relative"
      style={{ lineHeight: lineSpacing }}
    >
      {showVerseNumbers && (
        <span
          className="inline-block mr-3 font-bold select-none cursor-pointer hover:opacity-70"
          style={{
            color: theme.accent,
            fontSize: `${fontSize * 0.7}px`,
            fontFamily: 'Inter, sans-serif',
            minWidth: '32px',
            textAlign: 'left',
            verticalAlign: 'top',
          }}
          onClick={() => isSelected ? onDeselect(verseKey) : onSelect(verseKey)}
          aria-label={`Verse ${verse.verse}`}
        >
          {verse.verse}
        </span>
      )}
      
      <span
        role="button"
        tabIndex={0}
        aria-label={`Verse ${verse.verse}: ${verse.text.substring(0, 100)}`}
        onClick={() => isSelected ? onDeselect(verseKey) : onSelect(verseKey)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { isSelected ? onDeselect(verseKey) : onSelect(verseKey); } }}
        className="cursor-pointer rounded-sm transition-all duration-100 select-none"
        style={{
          fontFamily: `${fontFamily}, serif`,
          fontSize: `${fontSize}px`,
          lineHeight: lineSpacing,
          backgroundColor: isSelected
            ? `${theme.accent}22`
            : highlightColor
              ? highlightColor.bg
              : 'transparent',
          borderBottom: highlight?.style === 'underline' ? `2px solid ${highlightColor?.border}` : 'none',
          color: isRedLetter ? '#CC2200' : theme.text,
          padding: isSelected ? '0 2px' : '0',
          outline: isSelected ? `2px solid ${theme.accent}44` : 'none',
          outlineOffset: '1px',
        }}
      >
        {verse.text}
        {showCrossRef && verseRefs.length > 0 && (
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              onCrossRefTap(refKey); 
            }}
            className="inline-flex items-center justify-center ml-1.5 align-middle transition-all hover:scale-110"
            style={{ 
              color: theme.accent, 
              fontSize: '0.7em',
              backgroundColor: `${theme.accent}20`,
              width: '18px',
              height: '18px',
              borderRadius: '50%',
            }}
            aria-label={`Cross references for ${refKey}`}
            title={`View cross references (${verseRefs.length})`}
          >
            <Link2 size={10} />
          </button>
        )}
      </span>
    </div>
  );
};

// ─── Main ReaderScreen Component ─────────────────────────────────────────────

const ReaderScreen: React.FC = () => {
  const {
    readingPosition, readerSettings, highlights, selectedVerses,
    isAnnotationToolbarOpen, navigate, setReadingPosition,
    updateReaderSettings, selectVerse, deselectVerse,
    addBookmark, bookmarks, recordReadingSession
  } = useAppStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const { 
    verses: apiVerses, 
    isLoading, 
    error, 
    progress, 
    refetch,
    isOffline,
    fromCache
  } = useBibleChapter(
    readingPosition.book,
    readingPosition.chapter,
    readingPosition.translation || readerSettings.translation
  );

  // Download current book for offline
  const downloadCurrentBook = async () => {
    const book = readingPosition.book;
    const totalChapters = currentBook?.chapters || 1;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    for (let ch = 1; ch <= totalChapters; ch++) {
      try {
        const response = await fetch(
          `https://logos-daily-backend.onrender.com/api/bible/${encodeURIComponent(book)}/${ch}?translation=${readerSettings.translation.toLowerCase()}`
        );
        const data = await response.json();
        
        if (data.success && data.data) {
          await offlineStorage.saveChapter(book, ch, readerSettings.translation, data.data);
        }
        
        setDownloadProgress(Math.round((ch / totalChapters) * 100));

        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      } catch (e) {
        console.error(`Failed to cache ${book} ${ch}`, e);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    setIsDownloading(false);
    showToast(`✅ ${book} saved for offline reading!`, '#4CAF50');
  };
  
  const showToast = (message: string, bgColor: string) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: ${bgColor}; color: white; padding: 10px 20px;
      border-radius: 10px; z-index: 1000; font-size: 14px;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };



  // Debug logs
  useEffect(() => {
    console.log('📖 ReaderScreen: apiVerses state:', {
      type: typeof apiVerses,
      isArray: Array.isArray(apiVerses),
      length: apiVerses?.length,
      firstVerse: apiVerses?.[0],
      allVerses: apiVerses
    });
  }, [apiVerses]);

  useEffect(() => {
    console.log('📖 ReaderScreen: isLoading:', isLoading);
  }, [isLoading]);

  useEffect(() => {
    console.log('📖 ReaderScreen: error:', error);
  }, [error]);


  const theme = getTheme(readerSettings.theme);
  const [showSettings, setShowSettings] = useState(false);
  const [showBookNav, setShowBookNav] = useState(false);
  const [showChapterNav, setShowChapterNav] = useState(false);
  const [showVerseNav, setShowVerseNav] = useState(false);
  const [showQuickNav, setShowQuickNav] = useState(false);
  const [showBookFloatingButton, setShowBookFloatingButton] = useState(true);
  const [totalVerses, setTotalVerses] = useState(0);
  const [pendingChapter, setPendingChapter] = useState<number | null>(null);
  const [crossRefPanel, setCrossRefPanel] = useState<{ ref: string; refs: string[] } | null>(null);
  const [hasRecordedSession, setHasRecordedSession] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollOffset = useRef(0);
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  

  // Update total verses when chapter loads
  useEffect(() => {
    if (apiVerses && apiVerses.length > 0) {
      setTotalVerses(apiVerses.length);
      if (pendingChapter !== null) {
        setPendingChapter(null);
      }
    }
  }, [apiVerses, pendingChapter]);

  // Scroll to the current verse when the chapter loads
  useEffect(() => {
    if (apiVerses && apiVerses.length > 0 && readingPosition.verse > 1) {
      const timer = setTimeout(() => {
        const verseElement = document.getElementById(`verse-${readingPosition.verse}`);
        if (verseElement) {
          verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          verseElement.style.transition = 'background-color 2s';
          verseElement.style.backgroundColor = `${theme.accent}33`;
          setTimeout(() => {
            verseElement.style.backgroundColor = 'transparent';
          }, 2000);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [apiVerses, readingPosition.verse]);

  // Record reading session when chapter is loaded
  useEffect(() => {
    if (apiVerses && apiVerses.length > 0 && !hasRecordedSession && !isLoading) {
      recordReadingSession({
        durationMinutes: Math.floor(apiVerses.length * 0.5),
        chaptersRead: 1,
        versesRead: apiVerses.length,
      });
      setHasRecordedSession(true);
    }
  }, [apiVerses, isLoading, hasRecordedSession, recordReadingSession]);

  // Add scroll listener to hide/show floating button
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const offsetY = scrollElement.scrollTop;
      // Hide button when scrolling down, show when scrolling up or near top
      if (offsetY > scrollOffset.current && offsetY > 100) {
        setShowBookFloatingButton(false);
      } else {
        setShowBookFloatingButton(true);
      }
      scrollOffset.current = offsetY;
    };

    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, []);

  const displayVerses = apiVerses && apiVerses.length > 0 ? apiVerses.map(v => ({
    verse: v.verse,
    text: v.text,
    book: v.book,
    bookId: readingPosition.bookId,
    chapter: v.chapter,
    translation: v.translation
  })) : [];

  const currentBook = BIBLE_BOOKS.find(b => b.id === readingPosition.bookId);
  const totalChapters = currentBook?.chapters ?? 1;
  const isCurrentBookmarked = bookmarks.some(b =>
    b.bookId === readingPosition.bookId && b.chapter === readingPosition.chapter
  );

  const handleChapterSelect = (chapter: number) => {
    setShowChapterNav(false);
    setReadingPosition({ chapter, verse: 1 });
    setPendingChapter(chapter);
    setShowVerseNav(true);
  };

  const goToChapter = useCallback((chapter: number) => {
    if (chapter >= 1 && chapter <= totalChapters) {
      setReadingPosition({ chapter, verse: 1 });
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      setHasRecordedSession(false);
    }
  }, [totalChapters, setReadingPosition]);

  const goToVerse = useCallback((verse: number) => {
    if (verse >= 1 && verse <= totalVerses) {
      setReadingPosition({ verse });
      setTimeout(() => {
        const verseElement = document.getElementById(`verse-${verse}`);
        if (verseElement) {
          verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [totalVerses, setReadingPosition]);

  const handleQuickBookSelect = (book: string) => {
    const bookData = BIBLE_BOOKS.find(b => b.name === book);
    if (bookData) {
      setReadingPosition({
        book: bookData.name,
        bookId: bookData.id,
        chapter: 1,
        verse: 1,
      });
      setHasRecordedSession(false);
      setShowQuickNav(false);
      // Scroll to top (web version)
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCrossRefTap = (verseRef: string) => {
    const refs = CROSS_REFERENCES[verseRef] ?? [];
    setCrossRefPanel({ ref: verseRef, refs });
  };

  const toggleBookmark = () => {
    if (isCurrentBookmarked) {
      const bm = bookmarks.find(b => b.bookId === readingPosition.bookId && b.chapter === readingPosition.chapter);
      if (bm) useAppStore.getState().removeBookmark(bm.id);
    } else {
      addBookmark({
        bookId: readingPosition.bookId,
        book: readingPosition.book,
        chapter: readingPosition.chapter,
        verse: readingPosition.verse,
        label: `${readingPosition.book} ${readingPosition.chapter}`,
      });
    }
  };

  const handleContentTap = () => {
    if (readerSettings.focusMode) {
      updateReaderSettings({ focusMode: false });
    }
  };

  const parallelVerses = displayVerses.map(v => ({
    ...v,
    text: v.text.replace(/\b(thee|thou|thy|ye|hath|doth|saith|goeth|spake|verily)\b/gi, (w) => {
      const modern: Record<string, string> = {
        thee: 'you', thou: 'you', thy: 'your', ye: 'you', hath: 'has',
        doth: 'does', saith: 'says', goeth: 'goes', spake: 'spoke', verily: 'truly'
      };
      return modern[w.toLowerCase()] || w;
    }),
    translation: 'NIV (Modern)',
  }));

  const isParallel = readerSettings.viewMode === 'parallel';
  const isVerseComparison = readerSettings.viewMode === 'verse-comparison';

  // Loading state
  if (isLoading && !apiVerses) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ backgroundColor: theme.bg }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: theme.accent }} />
          <p className="text-sm font-medium" style={{ color: theme.text }}>
            Loading {readingPosition.book} {readingPosition.chapter}...
          </p>
          <p className="text-xs mt-2" style={{ color: theme.textMuted }}>Progress: {progress}%</p>
          {isOffline && (
            <p className="text-xs mt-4" style={{ color: '#f59e0b' }}>
              <WifiOff size={12} className="inline mr-1" />
              Offline mode - checking cache
            </p>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error && !apiVerses) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8" style={{ backgroundColor: theme.bg }}>
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">📖</div>
          <h3 className="text-lg font-bold mb-2" style={{ color: theme.text }}>Unable to Load Scripture</h3>
          <p className="text-sm mb-6" style={{ color: theme.textMuted }}>{error}</p>
          <div className="space-y-3">
            <button onClick={() => refetch()} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold w-full" style={{ backgroundColor: theme.accent, color: 'white' }}>
              <RefreshCw size={18} /> Retry
            </button>
            <button onClick={() => navigate('home')} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold w-full" style={{ backgroundColor: theme.surface, color: theme.text }}>
              <ArrowLeft size={18} /> Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: theme.bg }}>

      {/* Download progress bar */}
      {isDownloading && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1" style={{ backgroundColor: theme.border }}>
          <div 
            className="h-full transition-all duration-300" 
            style={{ 
              width: `${downloadProgress}%`, 
              backgroundColor: theme.accent 
            }} 
          />
        </div>
      )}

      {/* Offline/Cache Indicator */}
      {(isOffline || fromCache) && !isLoading && (
        <div className="flex items-center justify-center gap-2 py-1.5 text-xs" 
          style={{ backgroundColor: fromCache ? '#4caf5020' : '#f59e0b20', color: fromCache ? '#4caf50' : '#f59e0b' }}>
          {fromCache ? <HardDrive size={12} /> : <WifiOff size={12} />}
          <span>{fromCache ? 'Reading from offline cache' : 'Offline mode - using cached chapters'}</span>
        </div>
      )}

      {/* Top Navigation Bar - hidden in focus mode */}
      {!readerSettings.focusMode && (
        <nav className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ backgroundColor: theme.navBg, borderBottom: `1px solid ${theme.border}` }}>
          <button onClick={() => navigate('home')} className="flex items-center gap-1.5 p-2 -ml-2 rounded-xl transition-all" style={{ color: theme.textMuted }}>
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBookNav(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all"
              style={{ backgroundColor: theme.surface, color: theme.text }}
            >
              <BookOpen size={14} style={{ color: theme.accent }} />
              <span className="font-bold text-sm" style={{ fontFamily: 'Crimson Pro, serif' }}>
                {readingPosition.book}
              </span>
            </button>

            <button
              onClick={() => setShowChapterNav(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
              style={{ backgroundColor: theme.surface, color: theme.text }}
            >
              <span className="text-sm font-medium">Chapter</span>
              <span className="font-bold text-sm">{readingPosition.chapter}</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* Download for offline button */}
            <button
              onClick={downloadCurrentBook}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" 
              style={{ color: theme.textMuted }}
              title="Download book for offline reading"
            >
              <Download size={18} />
            </button>
            <button onClick={() => refetch()} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" style={{ color: theme.textMuted }} disabled={isLoading}>
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button onClick={toggleBookmark} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" style={{ color: isCurrentBookmarked ? theme.accent : theme.textMuted }}>
              <Bookmark size={18} fill={isCurrentBookmarked ? theme.accent : 'none'} />
            </button>
            <button onClick={() => setShowSettings(true)} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" style={{ color: theme.textMuted }}>
              <Settings2 size={18} />
            </button>
          </div>
        </nav>
      )}

      {/* Quick Navigation Bar - hidden in focus mode */}
      {!readerSettings.focusMode && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 flex-shrink-0" style={{ backgroundColor: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
          <button
            onClick={() => goToChapter(readingPosition.chapter - 1)}
            disabled={readingPosition.chapter <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30 hover:opacity-80"
            style={{ backgroundColor: theme.card, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          
          <div className="text-center">
            <span className="text-xs font-medium" style={{ color: theme.accent }}>
              Chapter {readingPosition.chapter} of {totalChapters}
            </span>
          </div>
          
          <button
            onClick={() => goToChapter(readingPosition.chapter + 1)}
            disabled={readingPosition.chapter >= totalChapters}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-30 hover:opacity-80"
            style={{ backgroundColor: theme.card, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* View Mode Toggle - hidden in focus mode */}
      {!readerSettings.focusMode && (
        <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0 overflow-x-auto" style={{ backgroundColor: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
          {[
            { id: 'scroll', icon: <AlignJustify size={13} />, label: 'Read' },
            { id: 'parallel', icon: <Columns size={13} />, label: 'Parallel' },
            { id: 'verse-comparison', icon: <MessageSquare size={13} />, label: 'Compare' },
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => updateReaderSettings({ viewMode: mode.id as typeof readerSettings.viewMode })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all"
              style={{
                backgroundColor: readerSettings.viewMode === mode.id ? theme.accent : 'transparent',
                color: readerSettings.viewMode === mode.id ? 'white' : theme.textMuted,
              }}
            >
              {mode.icon} {mode.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => updateReaderSettings({ focusMode: !readerSettings.focusMode })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all"
            style={{
              backgroundColor: readerSettings.focusMode ? theme.accent : 'transparent',
              color: readerSettings.focusMode ? 'white' : theme.textMuted,
            }}
          >
            {readerSettings.focusMode ? <EyeOff size={13} /> : <Eye size={13} />} Focus
          </button>
        </div>
      )}

      {/* Main Reading Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto relative"
        style={{ backgroundColor: theme.bg, scrollbarColor: `${theme.scrollbar} transparent` }}
        role="article"
      >
        <div
          ref={mainContentRef}
          onClick={handleContentTap}
          className="min-h-full"
        >
          <div
            className="mx-auto py-6"
            style={{
              maxWidth: isParallel ? '100%' : '720px',
              paddingLeft: `${readerSettings.marginWidth + 20}px`,
              paddingRight: `${readerSettings.marginWidth + 20}px`,
            }}
          >
            {!readerSettings.focusMode && (
              <div className="mb-8 text-center">
                <div
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-3 px-3 py-1 rounded-full"
                  style={{ backgroundColor: theme.accent + '18', color: theme.accent }}
                >
                  <span>{currentBook?.testament === 'OT' ? 'Old Testament' : 'New Testament'}</span>
                  <span>·</span>
                  <span>{currentBook?.category}</span>
                </div>
                <h1
                  className="font-bold mb-2"
                  style={{
                    fontFamily: 'Crimson Pro, serif',
                    fontSize: `${readerSettings.fontSize + 12}px`,
                    color: theme.text,
                  }}
                >
                  {readingPosition.book}
                </h1>
                <p style={{ color: theme.textMuted, fontFamily: 'Crimson Pro, serif', fontSize: `${readerSettings.fontSize - 2}px` }}>
                  Chapter {readingPosition.chapter}
                </p>
                <div className="w-12 h-0.5 mx-auto mt-4 rounded-full" style={{ backgroundColor: theme.border }} />
              </div>
            )}

            {readerSettings.focusMode && (
              <div className="text-center mb-4 opacity-50">
                <p className="text-xs" style={{ color: theme.textMuted }}>
                  {readingPosition.book} {readingPosition.chapter} · Tap anywhere to show controls
                </p>
              </div>
            )}

            {isParallel ? (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-center mb-4 pb-2 border-b" style={{ borderColor: theme.border }}>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded" style={{ backgroundColor: theme.accent + '20', color: theme.accent }}>
                      {readerSettings.translation}
                    </span>
                  </div>
                  <div>
                    {displayVerses.map(verse => (
                      <VerseText
                        key={verse.verse}
                        verse={verse}
                        highlights={highlights}
                        selectedVerses={selectedVerses}
                        onSelect={selectVerse}
                        onDeselect={deselectVerse}
                        showVerseNumbers={readerSettings.showVerseNumbers}
                        redLetterText={readerSettings.redLetterText}
                        theme={theme}
                        fontFamily={readerSettings.fontFamily}
                        fontSize={readerSettings.fontSize}
                        lineSpacing={readerSettings.lineSpacing}
                        showCrossRef={false}
                        crossRefs={[]}
                        onCrossRefTap={handleCrossRefTap}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-center mb-4 pb-2 border-b" style={{ borderColor: theme.border }}>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded" style={{ backgroundColor: theme.surface, color: theme.textMuted }}>
                      NIV (Demo)
                    </span>
                  </div>
                  <div>
                    {parallelVerses.map(verse => (
                      <VerseText
                        key={verse.verse}
                        verse={verse}
                        highlights={[]}
                        selectedVerses={[]}
                        onSelect={() => {}}
                        onDeselect={() => {}}
                        showVerseNumbers={readerSettings.showVerseNumbers}
                        redLetterText={false}
                        theme={theme}
                        fontFamily={readerSettings.fontFamily}
                        fontSize={readerSettings.fontSize}
                        lineSpacing={readerSettings.lineSpacing}
                        showCrossRef={false}
                        crossRefs={[]}
                        onCrossRefTap={() => {}}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : isVerseComparison ? (
              <div className="space-y-6">
                {displayVerses.map(verse => (
                  <div key={verse.verse} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                    <div className="px-4 py-2" style={{ backgroundColor: theme.surface, borderBottom: `1px solid ${theme.border}` }}>
                      <span className="text-xs font-bold" style={{ color: theme.accent }}>Verse {verse.verse}</span>
                    </div>
                    <div className="divide-y" style={{ borderColor: theme.border }}>
                      <div className="px-4 py-3">
                        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.accent }}>{readerSettings.translation}</div>
                        <p className="text-sm leading-relaxed" style={{ color: theme.text }}>{verse.text}</p>
                      </div>
                      <div className="px-4 py-3">
                        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>NIV (Demo)</div>
                        <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>{parallelVerses[verse.verse - 1]?.text ?? verse.text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {displayVerses.map(verse => {
                  const verseRefKey = `${verse.book} ${verse.chapter}:${verse.verse}`;
                  const hasCrossRefs = !!CROSS_REFERENCES[verseRefKey];
                  const crossRefsList = hasCrossRefs ? CROSS_REFERENCES[verseRefKey] : [];
                  return (
                    <VerseText
                      key={verse.verse}
                      verse={verse}
                      highlights={highlights}
                      selectedVerses={selectedVerses}
                      onSelect={selectVerse}
                      onDeselect={deselectVerse}
                      showVerseNumbers={readerSettings.showVerseNumbers}
                      redLetterText={readerSettings.redLetterText}
                      theme={theme}
                      fontFamily={readerSettings.fontFamily}
                      fontSize={readerSettings.fontSize}
                      lineSpacing={readerSettings.lineSpacing}
                      showCrossRef={readerSettings.showCrossReferences && hasCrossRefs}                    
                      crossRefs={crossRefsList}
                      onCrossRefTap={handleCrossRefTap}
                    />
                  );
                })}
              </div>
            )}

            {!readerSettings.focusMode && (
              <div className="mt-8 pt-4 text-center">
                <div className="inline-flex items-center gap-2 text-xs" style={{ color: theme.textFaint }}>
                  <span>✝</span>
                  <span>End of Chapter {readingPosition.chapter}</span>
                  <span>✝</span>
                </div>
              </div>
            )}
            
            <div className="h-24" />
          </div>
        </div>

        {/* Floating Book Button - for quick book navigation */}
        <FloatingBookButton
          onPress={() => setShowQuickNav(true)}
          theme={theme}
          visible={!readerSettings.focusMode && showBookFloatingButton}
        />
      </div>

      {/* Focus Mode Indicator */}
      {readerSettings.focusMode && (
        <div 
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full text-xs font-medium transition-all duration-300"
          style={{ backgroundColor: theme.text + 'CC', color: theme.bg }}
        >
          Tap anywhere to show controls
        </div>
      )}

      {/* Annotation Toolbar */}
      {isAnnotationToolbarOpen && selectedVerses.length > 0 && (
        <AnnotationToolbar />
      )}

      {/* Cross Reference Panel */}
      {crossRefPanel && (
        <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-5 pb-8 max-h-64 overflow-y-auto" style={{ backgroundColor: theme.navBg, borderTop: `1px solid ${theme.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ color: theme.text }}>Cross References</h3>
            <p className="text-xs font-medium" style={{ color: theme.accent }}>{crossRefPanel.ref}</p>
            <button onClick={() => setCrossRefPanel(null)} style={{ color: theme.textMuted }}><X size={18} /></button>
          </div>
          <div className="space-y-2">
            {crossRefPanel.refs.map(ref => (
              <button
                key={ref}
                className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all hover:opacity-80"
                style={{ backgroundColor: theme.surface, color: theme.text }}
                onClick={() => {
                  const parts = ref.split(' ');
                  const chapterVerse = parts[parts.length - 1];
                  const bookName = parts.slice(0, -1).join(' ');
                  const [ch, v] = chapterVerse.split(':');
                  const book = BIBLE_BOOKS.find(b => b.name === bookName || b.shortName === bookName);
                  if (book) {
                    setReadingPosition({ book: book.name, bookId: book.id, chapter: parseInt(ch), verse: parseInt(v) || 1 });
                    setCrossRefPanel(null);
                  }
                }}
              >
                <Link2 size={14} style={{ color: theme.accent }} />
                <span className="font-medium text-sm">{ref}</span>
                <ChevronRight size={14} className="ml-auto" style={{ color: theme.textFaint }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <ReaderSettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {/* Book Navigator */}
      {showBookNav && (
        <BookNavigator onClose={() => setShowBookNav(false)} />
      )}

      {/* Chapter Navigator Modal */}
      {showChapterNav && (
        <ChapterNavigator
          currentBook={currentBook}
          currentChapter={readingPosition.chapter}
          onChapterChange={handleChapterSelect}
          onClose={() => setShowChapterNav(false)}
          theme={theme}
        />
      )}

      {/* Verse Navigator Modal */}
      {showVerseNav && (
        <VerseNavigator
          currentChapter={readingPosition.chapter}
          totalVerses={totalVerses}
          currentVerse={readingPosition.verse}
          onVerseChange={goToVerse}
          onClose={() => setShowVerseNav(false)}
          theme={theme}
        />
      )}

      {/* Quick Book Navigator Modal */}
      {showQuickNav && (
        <BookQuickNavigator
          visible={showQuickNav}
          onClose={() => setShowQuickNav(false)}
          onSelectBook={handleQuickBookSelect}
          currentBook={readingPosition.book}
          theme={theme}
        />
      )}
    </div>
  );
};

export default ReaderScreen;