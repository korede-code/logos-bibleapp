/**
 * Logos Daily — Bookmarks Screen
 * ================================
 * Manage your saved verses with:
 * - Verse text preview from Bible API
 * - Quick navigation to verses
 * - Custom labels for bookmarks
 * - Offline support
 */

import React, { useState } from 'react';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { useAppStore } from '../store/appStore';
import { useBibleVerse } from '../hooks/useRealBibleData';
import { getTheme } from '../utils/themeUtils';
import { 
  ArrowLeft, 
  Bookmark, 
  Trash2, 
  ExternalLink,
  Search,
  X,
  Loader2,
  WifiOff,
  Calendar,
  FolderOpen,
  Share2
} from 'lucide-react';
import { format } from 'date-fns';

const BookmarksScreen: React.FC = () => {
  const { readerSettings, bookmarks, navigate, setReadingPosition, removeBookmark } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<string | null>(null);

  // Get unique books from bookmarks
  const availableBooks = Array.from(new Set(bookmarks.map(b => b.book))).sort();

  // Filter bookmarks
  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch = searchQuery === '' || 
      `${bookmark.book} ${bookmark.chapter}:${bookmark.verse}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bookmark.label || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBook = !selectedBook || bookmark.book === selectedBook;
    
    return matchesSearch && matchesBook;
  });

  // Group by book
  const groupedBookmarks = filteredBookmarks.reduce((acc, bookmark) => {
    if (!acc[bookmark.book]) acc[bookmark.book] = [];
    acc[bookmark.book].push(bookmark);
    return acc;
  }, {} as Record<string, typeof bookmarks>);

  const handleDeleteAll = () => {
    if (confirm('Are you sure you want to delete all bookmarks?')) {
      bookmarks.forEach(b => removeBookmark(b.id));
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('home')} style={{ color: theme.textMuted }}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif' }}>
              Bookmarks
            </h1>
          </div>
          {bookmarks.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: `${theme.accent}15`, color: theme.accent }}
            >
              Clear All
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
          style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
        >
          <Search size={16} style={{ color: theme.textMuted }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bookmarks by verse or label..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: theme.text }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ color: theme.textMuted }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Book Filter */}
        {availableBooks.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedBook(null)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                backgroundColor: !selectedBook ? theme.accent : theme.surface,
                color: !selectedBook ? 'white' : theme.textMuted,
              }}
            >
              All Books
            </button>
            {availableBooks.map(book => (
              <button
                key={book}
                onClick={() => setSelectedBook(selectedBook === book ? null : book)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  backgroundColor: selectedBook === book ? theme.accent : theme.surface,
                  color: selectedBook === book ? 'white' : theme.textMuted,
                }}
              >
                {book}
              </button>
            ))}
          </div>
        )}

        {/* Results count */}
        {(searchQuery || selectedBook) && (
          <p className="text-xs mt-2 pl-1" style={{ color: theme.textMuted }}>
            {filteredBookmarks.length} {filteredBookmarks.length === 1 ? 'bookmark' : 'bookmarks'} found
          </p>
        )}
      </div>

      {/* Bookmarks List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {filteredBookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="text-5xl">🔖</div>
            <div className="text-center">
              <p className="font-bold mb-1" style={{ color: theme.text }}>No bookmarks yet</p>
              <p className="text-sm" style={{ color: theme.textMuted }}>
                {searchQuery || selectedBook 
                  ? 'Try a different search or filter' 
                  : 'Bookmark your favorite verses while reading'}
              </p>
            </div>
            {!searchQuery && !selectedBook && (
              <button
                onClick={() => navigate('reader')}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ backgroundColor: theme.accent, color: 'white' }}
              >
                Start Reading
              </button>
            )}
          </div>
        ) : (
          Object.entries(groupedBookmarks).map(([bookName, bookBookmarks]) => (
            <div key={bookName}>
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen size={14} style={{ color: theme.accent }} />
                <h2 className="text-sm font-bold" style={{ color: theme.accent }}>
                  {bookName}
                </h2>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.surface, color: theme.textMuted }}>
                  {bookBookmarks.length}
                </span>
              </div>
              <div className="space-y-3">
                {bookBookmarks.map(bookmark => (
                  <BookmarkCard 
                    key={bookmark.id} 
                    bookmark={bookmark} 
                    theme={theme} 
                    navigate={navigate} 
                    setReadingPosition={setReadingPosition} 
                    removeBookmark={removeBookmark} 
                  />
                ))}
              </div>
            </div>
          ))
        )}
        <div className="h-20" />
      </div>
    </div>
  );
};

// BookmarkCard Component with Bible API Integration
const BookmarkCard: React.FC<{ 
  bookmark: any; 
  theme: any; 
  navigate: any; 
  setReadingPosition: any; 
  removeBookmark: any;
}> = ({ bookmark, theme, navigate, setReadingPosition, removeBookmark }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Fetch verse text from API
  const { verse, isLoading, isOffline, error } = useBibleVerse(
    bookmark.book,
    bookmark.chapter,
    bookmark.verse,
    'KJV'
  );

  const handleNavigate = () => {
    setReadingPosition({
      book: bookmark.book,
      bookId: bookmark.bookId,
      chapter: bookmark.chapter,
      verse: bookmark.verse,
    });
    navigate('reader');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await removeBookmark(bookmark.id);
    setIsDeleting(false);
  };

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const reference = `${bookmark.book} ${bookmark.chapter}:${bookmark.verse}`;
    const verseText = verse?.text || 'Verse text not available';
    const shareText = `${reference}\n\n"${verseText}"\n\nShared from Synthesis Bible App`;

    // Use Capacitor Share on native, fallback to Web Share API / clipboard on web
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: reference,
          text: shareText,
          dialogTitle: 'Share verse',
        });
        return;
      } catch (err: any) {
        if (err.message?.includes('cancel')) return; // User cancelled
        console.error('Share failed:', err);
      }
    }

    // Web fallback: Try navigator.share first
    if (navigator.share) {
      try {
        await navigator.share({
          title: reference,
          text: shareText,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Final fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      showToast('✓ Verse copied to clipboard!');
    } catch {
      // Manual fallback for old browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('✓ Verse copied!');
    }
  };

  // Helper for toast
  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: #4CAF50; color: white; padding: 12px 24px;
      border-radius: 12px; z-index: 9999; font-size: 14px; font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: slideUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  return (
    <div 
      className="rounded-2xl p-4 transition-all active:scale-[0.99]"
      style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
    >
      <div className="flex justify-between items-start mb-2">
        <button
          onClick={handleNavigate}
          className="flex items-center gap-2 group"
        >
          <Bookmark size={14} style={{ color: theme.accent }} />
          <span className="text-sm font-bold" style={{ color: theme.accent }}>
            {bookmark.book} {bookmark.chapter}:{bookmark.verse}
          </span>
          <ExternalLink size={12} style={{ color: theme.textMuted }} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
        
        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: theme.textMuted }}
            aria-label="Share verse"
          >
            <Share2 size={12} />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: theme.textMuted }}
            aria-label="Remove bookmark"
          >
            {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </div>
      </div>

      {/* Custom Label */}
      {bookmark.label && bookmark.label !== `${bookmark.book} ${bookmark.chapter}` && (
        <p className="text-xs font-medium mb-2" style={{ color: theme.accent }}>
          📌 {bookmark.label}
        </p>
      )}

      {/* Verse Text from API */}
      {isLoading ? (
        <div className="mb-2 p-2 rounded-lg" style={{ backgroundColor: theme.surface }}>
          <div className="flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" style={{ color: theme.accent }} />
            <span className="text-xs" style={{ color: theme.textMuted }}>Loading verse...</span>
          </div>
        </div>
      ) : error ? (
        <div className="mb-2 p-2 rounded-lg" style={{ backgroundColor: `${theme.accent}10` }}>
          <p className="text-xs" style={{ color: theme.accent }}>Unable to load verse</p>
        </div>
      ) : verse && (
        <div 
          className="mb-2 p-2 rounded-lg cursor-pointer hover:opacity-80 transition-all"
          style={{ backgroundColor: theme.surface }}
          onClick={handleNavigate}
        >
          <p className="text-sm leading-relaxed" style={{ color: theme.text }}>
            {verse.text.length > 150 ? `${verse.text.substring(0, 150)}...` : verse.text}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: theme.border }}>
        <div className="flex items-center gap-2">
          <Calendar size={10} style={{ color: theme.textFaint }} />
          <span className="text-xs" style={{ color: theme.textFaint }}>
            {format(new Date(bookmark.createdAt), 'MMM d, yyyy')}
          </span>
        </div>
        {isOffline && !isLoading && (
          <div className="flex items-center gap-1">
            <WifiOff size={10} style={{ color: '#f59e0b' }} />
            <span className="text-xs" style={{ color: '#f59e0b' }}>Cached</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookmarksScreen;