/**
 * Logos Daily — Bible Reader Screen
 * ====================================
 * The core reading experience featuring:
 * - Book → Chapter → Verse navigation flow
 * - Floating book button with same flow
 * - Multiple view modes (scroll, parallel)
 * - Verse selection and annotation toolbar
 * - Focus mode with chrome-free reading
 * - Red letter text support
 * - Audio Bible support
 * - Word study panel
 * 
 * 🔥 FIXED: Book → Chapter → Verse navigation flow
 * 🔥 FIXED: Floating button follows same flow
 * 🔥 FIXED: All imports properly configured
 */

import React, { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import {
  ChevronLeft, ChevronRight, Settings2, Bookmark, Download, HardDrive,
  X, BookOpen, ArrowLeft,
  Columns, AlignJustify, Eye, EyeOff, Link2, Volume2, MessageSquare,
  WifiOff, RefreshCw, Search, Lightbulb, Crown
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { BIBLE_BOOKS } from '../data/bibleData';
import { getTheme, HIGHLIGHT_COLORS } from '../utils/themeUtils';
import { format } from 'date-fns';

// ✅ Import offlineStorage here (not with require)
import { offlineStorage } from '../services/offlineStorage';

// Lazy load heavy components
const AudioPlayer = React.lazy(() => import('./AudioPlayer'));
const AnnotationToolbar = React.lazy(() => import('./AnnotationToolbar'));
const ReaderSettingsPanel = React.lazy(() => import('./ReaderSettingsPanel'));
const BookNavigator = React.lazy(() => import('./BookNavigator'));
const WordStudyPanel = React.lazy(() => import('./WordStudyPanel'));

// ─── Types ───────────────────────────────────────────────────────────────────

interface VerseData {
  verse: number;
  text: string;
  book: string;
  bookId: number;
  chapter: number;
  translation?: string;
}

interface VerseTextProps {
  verse: VerseData;
  highlights: any[];
  selectedVerses: string[];
  onSelect: (key: string) => void;
  onDeselect: (key: string) => void;
  showVerseNumbers: boolean;
  redLetterText: boolean;
  theme: any;
  fontFamily: string;
  fontSize: number;
  lineSpacing: number;
  showCrossRef: boolean;
  crossRefs: string[];
  onCrossRefTap: (ref: string) => void;
  isParallel?: boolean;
}

// ─── Red Letter Text Data ──────────────────────────────────────────────────

const RED_LETTER_VERSES: Record<string, number[]> = {
  'Matthew:3': [15],
  'Matthew:4': [4, 7, 10, 17, 19],
  'Matthew:5': [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48],
  'Matthew:6': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34],
  'Matthew:7': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29],
  'Matthew:8': [3, 7, 10, 11, 12, 13, 20, 22, 26],
  'Matthew:9': [2, 4, 5, 6, 9, 12, 13, 15, 16, 17, 22, 28, 29, 37, 38],
  'Matthew:10': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42],
  'Matthew:11': [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  'Matthew:12': [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
  'John:3': [3,5,6,7,8,10,11,12,13,14,15,16,17,18,19,20,21],
  'John:14': [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21],
  'John:15': [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17],
};

// ─── Helper Functions ──────────────────────────────────────────────────────

const isRedLetterVerse = (book: string, chapter: number, verse: number): boolean => {
  const gospels = ['Matthew', 'Mark', 'Luke', 'John'];
  if (!gospels.includes(book)) return false;
  const key = `${book}:${chapter}`;
  const verses = RED_LETTER_VERSES[key];
  return verses ? verses.includes(verse) : false;
};

// ─── All Books List ────────────────────────────────────────────────────────

const ALL_BOOKS = BIBLE_BOOKS.map(b => b.name);

// ─── Book Selector Panel ──────────────────────────────────────────────────

const BookSelectorPanel: React.FC<{
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
        <div className="p-5 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: theme.text }}>
              Select Book
            </h2>
            <button onClick={onClose} style={{ color: theme.textMuted }}>
              <X size={24} />
            </button>
          </div>
          <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
            Choose a book to continue reading
          </p>
        </div>

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
      </div>
    </div>
  );
};

// ─── Chapter Selector Panel ───────────────────────────────────────────────

const ChapterSelectorPanel: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelectChapter: (chapter: number) => void;
  currentBook: any;
  currentChapter: number;
  theme: any;
}> = ({ visible, onClose, onSelectChapter, currentBook, currentChapter, theme }) => {
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
        <div className="p-5 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold" style={{ color: theme.text }}>
                Select Chapter
              </h2>
              <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                {currentBook?.name} · Chapters 1 – {currentBook?.chapters}
              </p>
            </div>
            <button onClick={onClose} style={{ color: theme.textMuted }}>
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: currentBook?.chapters || 50 }, (_, i) => i + 1).map(ch => (
              <button
                key={ch}
                onClick={() => {
                  onSelectChapter(ch);
                  onClose();
                }}
                className="py-3 rounded-lg text-sm font-medium transition-all hover:scale-105"
                style={{
                  backgroundColor: ch === currentChapter ? theme.accent : theme.surface,
                  color: ch === currentChapter ? 'white' : theme.text,
                  border: `1px solid ${ch === currentChapter ? theme.accent : theme.border}`,
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

// ─── Verse Selector Panel ─────────────────────────────────────────────────

const VerseSelectorPanel: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSelectVerse: (verse: number) => void;
  currentChapter: number;
  totalVerses: number;
  currentVerse: number;
  theme: any;
}> = ({ visible, onClose, onSelectVerse, currentChapter, totalVerses, currentVerse, theme }) => {
  if (!visible) return null;

  if (totalVerses === 0) {
    return (
      <div 
        className="fixed inset-0 z-[60] flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
      >
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
        <div className="p-5 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold" style={{ color: theme.text }}>
                Select Verse
              </h2>
              <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                Chapter {currentChapter} · {totalVerses} verses
              </p>
            </div>
            <button onClick={onClose} style={{ color: theme.textMuted }}>
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {verseGroups.map((group, idx) => (
            <div key={idx} className="flex gap-2 justify-center flex-wrap">
              {group.map(verse => (
                <button
                  key={verse}
                  onClick={() => {
                    onSelectVerse(verse);
                    onClose();
                  }}
                  className="w-12 h-12 rounded-lg text-sm font-medium transition-all hover:scale-105"
                  style={{
                    backgroundColor: verse === currentVerse ? theme.accent : theme.surface,
                    color: verse === currentVerse ? 'white' : theme.text,
                    border: `1px solid ${verse === currentVerse ? theme.accent : theme.border}`,
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
  );
};

// ─── Memoized VerseText Component ────────────────────────────────────────

const VerseText = memo<VerseTextProps>(({
  verse, highlights, selectedVerses, onSelect, onDeselect,
  showVerseNumbers, redLetterText, theme, fontFamily, fontSize,
  lineSpacing, showCrossRef, crossRefs, onCrossRefTap, isParallel
}) => {
  const verseKey = `${verse.bookId}:${verse.chapter}:${verse.verse}`;
  const isSelected = selectedVerses.includes(verseKey);
  const highlight = highlights.find(h =>
    h.bookId === verse.bookId && h.chapter === verse.chapter && h.verse === verse.verse
  );
  const highlightColor = highlight ? HIGHLIGHT_COLORS[highlight.color] : null;
  const isRedLetter = redLetterText && isRedLetterVerse(verse.book, verse.chapter, verse.verse);
  const refKey = `${verse.book} ${verse.chapter}:${verse.verse}`;
  const verseRefs = crossRefs || [];

  const handleClick = useCallback(() => {
    if (isSelected) {
      onDeselect(verseKey);
    } else {
      onSelect(verseKey);
    }
  }, [isSelected, verseKey, onSelect, onDeselect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

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
          onClick={handleClick}
          aria-label={`Verse ${verse.verse}`}
        >
          {verse.verse}
        </span>
      )}
      
      <span
        role="button"
        tabIndex={0}
        aria-label={`Verse ${verse.verse}: ${verse.text.substring(0, 100)}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
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
        {showCrossRef && verseRefs.length > 0 && !isParallel && (
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
});

VerseText.displayName = 'VerseText';

// ─── Floating Book Button ─────────────────────────────────────────────────

const FloatingBookButton: React.FC<{ 
  onPress: () => void; 
  theme: any; 
  visible: boolean 
}> = ({ onPress, theme, visible }) => {
  if (!visible) return null;

  return (
    <div
      className="fixed bottom-24 right-5 z-40 transition-all duration-300"
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

// ─── Main ReaderScreen Component ──────────────────────────────────────────

const ReaderScreen: React.FC = () => {
  const {
    readingPosition, readerSettings, highlights, selectedVerses,
    isAnnotationToolbarOpen, navigate, setReadingPosition,
    updateReaderSettings, selectVerse, deselectVerse,
    addBookmark, bookmarks, recordReadingSession, 
    isOnline, fetchChapter, currentChapterVerses,
    isApiLoading, apiError
  } = useAppStore();

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBookNav, setShowBookNav] = useState(false);
  const [showWordStudy, setShowWordStudy] = useState(false);
  const [showChapterNav, setShowChapterNav] = useState(false);
  const [showVerseNav, setShowVerseNav] = useState(false);
  const [showQuickNav, setShowQuickNav] = useState(false);
  const [showBookFloatingButton, setShowBookFloatingButton] = useState(true);
  const [totalVerses, setTotalVerses] = useState(0);
  const [pendingChapter, setPendingChapter] = useState<number | null>(null);
  const [crossRefPanel, setCrossRefPanel] = useState<{ ref: string; refs: string[] } | null>(null);
  const [hasRecordedSession, setHasRecordedSession] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // ✅ New state for navigation flow
  const [navStep, setNavStep] = useState<'book' | 'chapter' | 'verse'>('book');
  const [selectedBook, setSelectedBook] = useState<string>(readingPosition.book);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollOffset = useRef(0);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const theme = getTheme(readerSettings.theme);

  // ─── Compute Display Verses ─────────────────────────────────────────────

  const displayVerses = useMemo(() => {
    if (currentChapterVerses && currentChapterVerses.length > 0) {
      return currentChapterVerses.map(v => ({
        verse: v.verse,
        text: v.text,
        book: v.book,
        bookId: readingPosition.bookId,
        chapter: v.chapter,
        translation: v.translation || readerSettings.translation
      }));
    }
    return [];
  }, [currentChapterVerses, readingPosition.bookId, readerSettings.translation]);

  // ─── Current Book Info ──────────────────────────────────────────────────

  const currentBook = BIBLE_BOOKS.find(b => b.id === readingPosition.bookId);
  const totalChapters = currentBook?.chapters ?? 1;
  const isCurrentBookmarked = bookmarks.some(b =>
    b.bookId === readingPosition.bookId && b.chapter === readingPosition.chapter
  );

  // ─── Effects ─────────────────────────────────────────────────────────────

  // Update total verses when chapter loads
  useEffect(() => {
    if (displayVerses.length > 0) {
      setTotalVerses(displayVerses.length);
      if (pendingChapter !== null) {
        setPendingChapter(null);
      }
    }
  }, [displayVerses, pendingChapter]);

  // Scroll to verse when chapter loads
  useEffect(() => {
    if (displayVerses.length > 0 && readingPosition.verse > 1) {
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
  }, [displayVerses, readingPosition.verse, theme.accent]);

  // Record reading session
  useEffect(() => {
    if (displayVerses.length > 0 && !hasRecordedSession && !isApiLoading) {
      recordReadingSession({
        durationMinutes: Math.floor(displayVerses.length * 0.5),
        chaptersRead: 1,
        versesRead: displayVerses.length,
      });
      setHasRecordedSession(true);
    }
  }, [displayVerses, isApiLoading, hasRecordedSession, recordReadingSession]);

  // Scroll listener for floating button
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const offsetY = scrollElement.scrollTop;
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

  // Fetch chapter when needed
  useEffect(() => {
    if (readingPosition.book && readingPosition.chapter) {
      fetchChapter(
        readerSettings.translation || 'KJV',
        readingPosition.book,
        readingPosition.chapter
      );
    }
  }, [readingPosition.book, readingPosition.chapter, readerSettings.translation, fetchChapter]);

  // ─── Navigation Handlers ────────────────────────────────────────────────

  // ✅ Handle book selection - opens chapter selector
  const handleBookSelect = useCallback((book: string) => {
    const bookData = BIBLE_BOOKS.find(b => b.name === book);
    if (bookData) {
      setSelectedBook(book);
      // Set the book and default to chapter 1
      setReadingPosition({
        book: bookData.name,
        bookId: bookData.id,
        chapter: 1,
        verse: 1,
      });
      setHasRecordedSession(false);
      setShowBookNav(false);
      // ✅ Open chapter selector after book selection
      setTimeout(() => {
        setShowChapterNav(true);
      }, 300);
    }
  }, [setReadingPosition]);

  // ✅ Handle chapter selection - opens verse selector
  const handleChapterSelect = useCallback((chapter: number) => {
    setReadingPosition({ chapter, verse: 1 });
    setHasRecordedSession(false);
    setShowChapterNav(false);
    // ✅ Open verse selector after chapter selection
    setTimeout(() => {
      setShowVerseNav(true);
    }, 300);
  }, [setReadingPosition]);

  // ✅ Handle verse selection - closes all panels
  const handleVerseSelect = useCallback((verse: number) => {
    setReadingPosition({ verse });
    setShowVerseNav(false);
    setTimeout(() => {
      const verseElement = document.getElementById(`verse-${verse}`);
      if (verseElement) {
        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, [setReadingPosition]);

  // ✅ Handle quick book selection (from floating button)
  const handleQuickBookSelect = useCallback((book: string) => {
    const bookData = BIBLE_BOOKS.find(b => b.name === book);
    if (bookData) {
      setSelectedBook(book);
      setReadingPosition({
        book: bookData.name,
        bookId: bookData.id,
        chapter: 1,
        verse: 1,
      });
      setHasRecordedSession(false);
      setShowQuickNav(false);
      // ✅ Open chapter selector after book selection
      setTimeout(() => {
        setShowChapterNav(true);
      }, 300);
    }
  }, [setReadingPosition]);

  // ─── Other Handlers ──────────────────────────────────────────────────────

  const goToChapter = useCallback((chapter: number) => {
    if (chapter >= 1 && chapter <= totalChapters) {
      setReadingPosition({ chapter, verse: 1 });
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      setHasRecordedSession(false);
    }
  }, [totalChapters, setReadingPosition]);

  const handleCrossRefTap = useCallback((verseRef: string) => {
    setCrossRefPanel({ ref: verseRef, refs: [] });
  }, []);

  const toggleBookmark = useCallback(() => {
    if (isCurrentBookmarked) {
      const bm = bookmarks.find(b => 
        b.bookId === readingPosition.bookId && b.chapter === readingPosition.chapter
      );
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
  }, [isCurrentBookmarked, bookmarks, readingPosition, addBookmark]);

  const handleContentTap = useCallback(() => {
    if (readerSettings.focusMode) {
      updateReaderSettings({ focusMode: false });
    }
  }, [readerSettings.focusMode, updateReaderSettings]);

  const handleCloseCrossRef = useCallback(() => {
    setCrossRefPanel(null);
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────────

  // Loading state
  if (isApiLoading && !displayVerses.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ backgroundColor: theme.bg }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: theme.accent }} />
          <p className="text-sm font-medium" style={{ color: theme.text }}>
            Loading {readingPosition.book} {readingPosition.chapter}...
          </p>
          {!isOnline && (
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
  if (apiError && !displayVerses.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8" style={{ backgroundColor: theme.bg }}>
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">📖</div>
          <h3 className="text-lg font-bold mb-2" style={{ color: theme.text }}>Unable to Load Scripture</h3>
          <p className="text-sm mb-6" style={{ color: theme.textMuted }}>{apiError}</p>
          <div className="space-y-3">
            <button 
              onClick={() => fetchChapter(readerSettings.translation || 'KJV', readingPosition.book, readingPosition.chapter)} 
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold w-full" 
              style={{ backgroundColor: theme.accent, color: 'white' }}
            >
              <RefreshCw size={18} /> Retry
            </button>
            <button 
              onClick={() => navigate('home')} 
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold w-full" 
              style={{ backgroundColor: theme.surface, color: theme.text }}
            >
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

      {/* Top Navigation Bar - hidden in focus mode */}
      {!readerSettings.focusMode && (
        <nav className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ backgroundColor: theme.navBg || theme.card, borderBottom: `1px solid ${theme.border}` }}>
          <button onClick={() => navigate('home')} className="flex items-center gap-1.5 p-2 -ml-2 rounded-xl transition-all" style={{ color: theme.textMuted }}>
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-2">
            {/* ✅ Book button - opens Book selector */}
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

            {/* ✅ Chapter button - opens Chapter selector */}
            <button
              onClick={() => setShowChapterNav(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
              style={{ backgroundColor: theme.surface, color: theme.text }}
            >
              <span className="text-sm font-medium">Chapter</span>
              <span className="font-bold text-sm">{readingPosition.chapter}</span>
            </button>

            {/* ✅ Verse button - opens Verse selector */}
            <button
              onClick={() => setShowVerseNav(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
              style={{ backgroundColor: theme.surface, color: theme.text }}
            >
              <span className="text-sm font-medium">Verse</span>
              <span className="font-bold text-sm">{readingPosition.verse}</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={toggleBookmark} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all" style={{ color: isCurrentBookmarked ? theme.accent : theme.textMuted }}>
              <Bookmark size={18} fill={isCurrentBookmarked ? theme.accent : 'none'} />
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ color: showMoreMenu ? theme.accent : theme.textMuted }}
              >
                <Settings2 size={18} />
              </button>
              
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                  <div 
                    className="absolute top-full right-0 mt-2 z-50 w-56 rounded-xl shadow-xl p-2"
                    style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
                  >
                    <button 
                      onClick={() => { setShowAudioPlayer(!showAudioPlayer); setShowMoreMenu(false); }} 
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm" 
                      style={{ color: theme.text }}
                    >
                      <Volume2 size={16} /> Audio Bible
                    </button>
                    <button 
                      onClick={() => { setShowWordStudy(true); setShowMoreMenu(false); }} 
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm" 
                      style={{ color: theme.text }}
                    >
                      <Lightbulb size={16} /> Word Study
                    </button>
                    <button 
                      onClick={() => { setShowMoreMenu(false); }} 
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm" 
                      style={{ color: theme.text }}
                    >
                      <Download size={16} /> Download Book
                    </button>
                    <button 
                      onClick={() => { 
                        fetchChapter(readerSettings.translation || 'KJV', readingPosition.book, readingPosition.chapter);
                        setShowMoreMenu(false); 
                      }} 
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm" 
                      style={{ color: theme.text }}
                    >
                      <RefreshCw size={16} /> Refresh
                    </button>
                    <button 
                      onClick={() => { setShowSettings(true); setShowMoreMenu(false); }} 
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm" 
                      style={{ color: theme.text }}
                    >
                      <Settings2 size={16} /> Settings
                    </button>
                  </div>
                </>
              )}
            </div>
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
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => updateReaderSettings({ viewMode: mode.id as 'scroll' | 'parallel' | 'paginated' | 'verse-comparison' })}
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
        style={{ backgroundColor: theme.bg, scrollbarColor: `${theme.scrollbar || theme.border} transparent` }}
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
              maxWidth: readerSettings.viewMode === 'parallel' ? '100%' : '720px',
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

            {readerSettings.viewMode === 'parallel' ? (
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
                        isParallel={true}
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
                    {displayVerses.map(verse => {
                      const modernText = verse.text
                        .replace(/\b(thee|thou|thy|ye|hath|doth|saith|goeth|spake|verily)\b/gi, (w) => {
                          const modern: Record<string, string> = {
                            thee: 'you', thou: 'you', thy: 'your', ye: 'you', hath: 'has',
                            doth: 'does', saith: 'says', goeth: 'goes', spake: 'spoke', verily: 'truly'
                          };
                          return modern[w.toLowerCase()] || w;
                        });
                      return (
                        <VerseText
                          key={verse.verse}
                          verse={{ ...verse, text: modernText, translation: 'NIV' }}
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
                          isParallel={true}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {displayVerses.map(verse => {
                  const verseRefKey = `${verse.book} ${verse.chapter}:${verse.verse}`;
                  const hasCrossRefs = false;
                  const crossRefsList = hasCrossRefs ? [] : [];
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

        {/* Floating Book Button */}
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
        <React.Suspense fallback={null}>
          <AnnotationToolbar />
        </React.Suspense>
      )}

      {/* Cross Reference Panel */}
      {crossRefPanel && (
        <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-5 pb-8 max-h-64 overflow-y-auto" style={{ backgroundColor: theme.navBg || theme.card, borderTop: `1px solid ${theme.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold" style={{ color: theme.text }}>Cross References</h3>
            <p className="text-xs font-medium" style={{ color: theme.accent }}>{crossRefPanel.ref}</p>
            <button onClick={handleCloseCrossRef} style={{ color: theme.textMuted }}><X size={18} /></button>
          </div>
          <div className="space-y-2">
            {crossRefPanel.refs.length > 0 ? (
              crossRefPanel.refs.map(ref => (
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
              ))
            ) : (
              <p className="text-sm text-center py-4" style={{ color: theme.textMuted }}>
                No cross references available
              </p>
            )}
          </div>
        </div>
      )}

      {/* ✅ Book Selector Panel */}
      <BookSelectorPanel
        visible={showBookNav}
        onClose={() => setShowBookNav(false)}
        onSelectBook={handleBookSelect}
        currentBook={readingPosition.book}
        theme={theme}
      />

      {/* ✅ Chapter Selector Panel */}
      <ChapterSelectorPanel
        visible={showChapterNav}
        onClose={() => setShowChapterNav(false)}
        onSelectChapter={handleChapterSelect}
        currentBook={currentBook}
        currentChapter={readingPosition.chapter}
        theme={theme}
      />

      {/* ✅ Verse Selector Panel */}
      <VerseSelectorPanel
        visible={showVerseNav}
        onClose={() => setShowVerseNav(false)}
        onSelectVerse={handleVerseSelect}
        currentChapter={readingPosition.chapter}
        totalVerses={totalVerses}
        currentVerse={readingPosition.verse}
        theme={theme}
      />

      {/* ✅ Quick Book Navigator (Floating Button) */}
      <BookSelectorPanel
        visible={showQuickNav}
        onClose={() => setShowQuickNav(false)}
        onSelectBook={handleQuickBookSelect}
        currentBook={readingPosition.book}
        theme={theme}
      />

      {/* Settings Panel */}
      <React.Suspense fallback={null}>
        {showSettings && (
          <ReaderSettingsPanel onClose={() => setShowSettings(false)} />
        )}
      </React.Suspense>

      {/* Book Navigator (from BookNavigator component) */}
      <React.Suspense fallback={null}>
        {showBookNav && false && (
          <BookNavigator onClose={() => setShowBookNav(false)} />
        )}
      </React.Suspense>

      {/* Word Study Panel */}
      <React.Suspense fallback={null}>
        {showWordStudy && (
          <WordStudyPanel
            isOpen={showWordStudy}
            onClose={() => setShowWordStudy(false)}
            selectedVerse={`${readingPosition.book} ${readingPosition.chapter}:${readingPosition.verse}`}
            theme={theme}
          />
        )}
      </React.Suspense>

      {/* Audio Player */}
      <React.Suspense fallback={null}>
        {showAudioPlayer && (
          <AudioPlayer
            verses={displayVerses}
            currentVerse={readingPosition.verse}
            isVisible={showAudioPlayer}
            onClose={() => {
              window.speechSynthesis?.cancel();
              setShowAudioPlayer(false);
            }}
            theme={theme}
          />
        )}
      </React.Suspense>
      
    </div>
  );
};

export default ReaderScreen;