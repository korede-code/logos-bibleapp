/**
 * AnnotationToolbar.tsx - Fixed with working color panel display
 */

import React, { useState } from 'react';
import { 
  Highlighter, MessageSquare, Copy, Share2, Bookmark, X
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getTheme, HIGHLIGHT_COLORS } from '../utils/themeUtils';
import { BIBLE_BOOKS } from '../data/bibleData';

type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'orange';

const AnnotationToolbar: React.FC = () => {
  const {
    selectedVerses,
    clearSelectedVerses,
    addHighlight,
    removeHighlight,
    addBookmark,
    saveNote,
    readerSettings,
    readingPosition,
    highlights,
    bookmarks,
  } = useAppStore();

  const theme = getTheme(readerSettings.theme);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [showToast, setShowToast] = useState<string | null>(null);

  const toast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2000);
  };

  // Debug log
  console.log('🟢 AnnotationToolbar rendered, showColorPicker:', showColorPicker);

  const getSelectedVersesData = () => {
    if (selectedVerses.length === 0) return null;

    const verses = selectedVerses.map(verseKey => {
      const [bookId, chapter, verse] = verseKey.split(':');
      return {
        bookId: parseInt(bookId),
        chapter: parseInt(chapter),
        verse: parseInt(verse),
      };
    });

    const firstVerse = verses[0];
    const book = BIBLE_BOOKS.find(b => b.id === firstVerse.bookId);

    return {
      verses,
      bookName: book?.name || readingPosition.book,
      bookId: firstVerse.bookId,
      chapter: firstVerse.chapter,
    };
  };

  const applyHighlight = (color: HighlightColor, style: 'highlight' | 'underline' = 'highlight') => {
    const verseData = getSelectedVersesData();
    if (!verseData) {
      toast('Please select verses first');
      return;
    }

    console.log('🖍️ Applying highlight:', { color, style, book: verseData.bookName, verses: verseData.verses });

    verseData.verses.forEach(verse => {
      const existingHighlight = highlights.find(
        h => h.bookId === verse.bookId && 
            h.chapter === verse.chapter && 
            h.verse === verse.verse
      );

      if (existingHighlight) {
        removeHighlight(existingHighlight.id);
      }

      addHighlight({
        bookId: verse.bookId,
        book: verseData.bookName,
        chapter: verse.chapter,
        verse: verse.verse,
        color: color,
        style: style,
      });
    });

    toast(`✓ Highlighted with ${color}`);
    setShowColorPicker(false);
  };

  const handleAddNote = () => {
    if (!noteContent.trim()) {
      toast('Please enter note content');
      return;
    }

    const verseData = getSelectedVersesData();
    if (!verseData) return;

    saveNote({
      bookId: verseData.bookId,
      book: verseData.bookName,
      chapter: verseData.chapter,
      verse: verseData.verses[0].verse,
      title: noteTitle.trim() || `${verseData.bookName} ${verseData.chapter}:${verseData.verses[0].verse}`,
      content: noteContent.trim(),
      tags: [],
    });

    toast('✓ Note saved');
    setNoteContent('');
    setNoteTitle('');
    setShowNoteInput(false);
    clearSelectedVerses();
  };

  const handleCopy = async () => {
    if (selectedVerses.length === 0) return;
    
    try {
      const texts: string[] = [];
      selectedVerses.forEach(verseKey => {
        const [, , verse] = verseKey.split(':');
        const el = document.getElementById(`verse-${verse}`);
        if (el) {
          const textSpan = el.querySelector('span[role="button"]');
          if (textSpan) {
            texts.push(`${verse}. ${textSpan.textContent?.trim()}`);
          }
        }
      });

      const verseData = getSelectedVersesData();
      const reference = verseData ? `${verseData.bookName} ${verseData.chapter}` : '';
      const fullText = `${reference}\n${texts.join('\n')}`;

      await navigator.clipboard.writeText(fullText);
      toast('✓ Copied');
    } catch {
      toast('Copy failed');
    }
  };

  const handleShare = async () => {
    if (selectedVerses.length === 0) return;
    
    const texts: string[] = [];
    selectedVerses.forEach(verseKey => {
      const [, , verse] = verseKey.split(':');
      const el = document.getElementById(`verse-${verse}`);
      if (el) {
        const textSpan = el.querySelector('span[role="button"]');
        if (textSpan) {
          texts.push(textSpan.textContent?.trim());
        }
      }
    });

    const verseData = getSelectedVersesData();
    const reference = verseData ? `${verseData.bookName} ${verseData.chapter}` : '';
    const shareText = `${reference}\n${texts.join(' ')}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Bible Verse', text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast('✓ Copied (share not supported)');
      }
    } catch {
      // User cancelled
    }
  };

  const handleBookmark = () => {
    const verseData = getSelectedVersesData();
    if (!verseData) return;

    verseData.verses.forEach(verse => {
      const isBookmarked = bookmarks.some(
        b => b.bookId === verse.bookId && 
            b.chapter === verse.chapter && 
            b.verse === verse.verse
      );

      if (!isBookmarked) {
        addBookmark({
          bookId: verse.bookId,
          book: verseData.bookName,
          chapter: verse.chapter,
          verse: verse.verse,
          label: `${verseData.bookName} ${verse.chapter}:${verse.verse}`,
        });
      }
    });

    toast('✓ Bookmarked');
    clearSelectedVerses();
  };

  // Get highlight colors from the utility
  const highlightColors = Object.entries(HIGHLIGHT_COLORS || {}) as [HighlightColor, { bg: string; border: string; text: string }][];

  return (
    <>
      {/* Main Toolbar */}
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 px-4 pt-4 pb-8 rounded-t-3xl"
        style={{ 
          backgroundColor: theme.navBg, 
          borderTop: `1px solid ${theme.border}`,
        }}
      >
        {/* Selected verses info */}
        <div className="flex items-center justify-between mb-4 px-2">
          <span className="text-sm font-bold" style={{ color: theme.text }}>
            {selectedVerses.length} {selectedVerses.length === 1 ? 'verse' : 'verses'} selected
          </span>
          <button onClick={clearSelectedVerses} style={{ color: theme.textMuted }}>
            <X size={18} />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          
          {/* ===== HIGHLIGHT BUTTON WITH COLOR PICKER ===== */}
          <div className="relative">
            <button
              onClick={() => {
                console.log('🟡 Highlight button clicked, toggling color picker');
                setShowColorPicker(!showColorPicker);
                // Close note input if open
                setShowNoteInput(false);
              }}
              className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-[64px] transition-all hover:opacity-80"
              style={{ 
                backgroundColor: showColorPicker ? `${theme.accent}30` : theme.surface, 
                color: theme.text,
                border: `1px solid ${showColorPicker ? theme.accent : theme.border}`,
              }}
            >
              <Highlighter size={18} style={{ color: '#EAB308' }} />
              <span className="text-[11px] font-medium">Highlight</span>
            </button>

            {/* ===== COLOR PICKER PANEL ===== */}
            {showColorPicker && (
              <div 
                className="fixed bottom-24 left-4 right-4 z-50 p-4 rounded-2xl shadow-2xl"
                style={{ 
                  backgroundColor: theme.card, 
                  border: `2px solid ${theme.border}`,
                  maxWidth: '400px',
                  margin: '0 auto',
                }}
              >
                {/* Close button */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold" style={{ color: theme.text }}>Choose Highlight Style</h4>
                  <button 
                    onClick={() => setShowColorPicker(false)}
                    className="p-1 rounded-lg hover:bg-opacity-20"
                    style={{ color: theme.textMuted }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Highlight colors */}
                <p className="text-xs mb-2 font-medium" style={{ color: theme.textMuted }}>
                  🎨 Background Highlight
                </p>
                <div className="flex gap-2 mb-3 justify-center">
                  {highlightColors.map(([colorName, colorValue]) => (
                    <button
                      key={colorName}
                      onClick={() => applyHighlight(colorName, 'highlight')}
                      className="w-11 h-11 rounded-xl border-2 transition-all hover:scale-110 active:scale-95 relative"
                      style={{ 
                        backgroundColor: colorValue.bg, 
                        borderColor: colorValue.border,
                        boxShadow: `0 2px 8px ${colorValue.border}44`,
                      }}
                      title={`${colorName} highlight`}
                      aria-label={`${colorName} highlight`}
                    >
                      <span 
                        className="absolute inset-0 flex items-center justify-center text-lg font-bold"
                        style={{ color: colorValue.text }}
                      >
                        A
                      </span>
                    </button>
                  ))}
                </div>

                {/* Divider */}
                <div className="border-t my-3" style={{ borderColor: theme.border }} />

                {/* Underline colors */}
                <p className="text-xs mb-2 font-medium" style={{ color: theme.textMuted }}>
                  ✏️ Underline
                </p>
                <div className="flex gap-2 justify-center">
                  {highlightColors.map(([colorName, colorValue]) => (
                    <button
                      key={`u-${colorName}`}
                      onClick={() => applyHighlight(colorName, 'underline')}
                      className="w-11 h-11 rounded-xl border-2 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
                      style={{ 
                        backgroundColor: 'transparent',
                        borderColor: colorValue.border,
                        borderBottomWidth: '4px',
                        borderBottomColor: colorValue.border,
                      }}
                      title={`${colorName} underline`}
                      aria-label={`${colorName} underline`}
                    >
                      <span 
                        className="text-sm font-bold"
                        style={{ color: colorValue.text }}
                      >
                        U
                      </span>
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-center mt-3 opacity-60" style={{ color: theme.textMuted }}>
                  Tap a color to apply to {selectedVerses.length} selected verse(s)
                </p>
              </div>
            )}
          </div>

          {/* Note button */}
          <button
            onClick={() => {
              setShowNoteInput(!showNoteInput);
              setShowColorPicker(false);
            }}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-[64px] transition-all hover:opacity-80"
            style={{ 
              backgroundColor: showNoteInput ? `${theme.accent}30` : theme.surface, 
              color: theme.text,
              border: `1px solid ${showNoteInput ? theme.accent : theme.border}`
            }}
          >
            <MessageSquare size={18} style={{ color: theme.accent }} />
            <span className="text-[11px] font-medium">Note</span>
          </button>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-[64px] transition-all hover:opacity-80"
            style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            <Copy size={18} />
            <span className="text-[11px] font-medium">Copy</span>
          </button>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-[64px] transition-all hover:opacity-80"
            style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            <Share2 size={18} />
            <span className="text-[11px] font-medium">Share</span>
          </button>

          {/* Bookmark button */}
          <button
            onClick={handleBookmark}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-[64px] transition-all hover:opacity-80"
            style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            <Bookmark size={18} />
            <span className="text-[11px] font-medium">Bookmark</span>
          </button>
        </div>
      </div>

      {/* Note Input Modal */}
      {showNoteInput && (
        <div 
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowNoteInput(false)}
        >
          <div 
            className="w-full max-w-lg rounded-t-3xl p-6 pb-10"
            style={{ backgroundColor: theme.navBg }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: theme.text }}>Add Note</h3>
              <button onClick={() => setShowNoteInput(false)} style={{ color: theme.textMuted }}>
                <X size={20} />
              </button>
            </div>
            <input
              type="text"
              value={noteTitle}
              onChange={e => setNoteTitle(e.target.value)}
              placeholder="Note title (optional)"
              className="w-full px-4 py-3 rounded-xl mb-3 text-sm outline-none"
              style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
            />
            <textarea
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              placeholder="Write your note..."
              className="w-full px-4 py-3 rounded-xl mb-4 text-sm outline-none resize-none"
              rows={5}
              autoFocus
              style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNoteInput(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                disabled={!noteContent.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: theme.accent, color: 'white' }}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div 
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[70] px-5 py-2.5 rounded-full text-sm font-medium shadow-lg"
          style={{ backgroundColor: theme.accent, color: 'white' }}
        >
          {showToast}
        </div>
      )}
    </>
  );
};

export default AnnotationToolbar;