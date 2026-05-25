// src/components/BookNavigator.tsx
import React, { useState } from 'react';
import { X, Search, ChevronRight, BookOpen, Scroll } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { BIBLE_BOOKS } from '../data/bibleData';
import { getTheme } from '../utils/themeUtils';

interface BookNavigatorProps {
  onClose: () => void;
}

const BookNavigator: React.FC<BookNavigatorProps> = ({ onClose }) => {
  const { readerSettings, setReadingPosition } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTestament, setSelectedTestament] = useState<'all' | 'OT' | 'NT'>('all');

  // Filter books based on search and testament
  const filteredBooks = BIBLE_BOOKS.filter(book => {
    const matchesSearch = book.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          book.shortName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTestament = selectedTestament === 'all' || book.testament === selectedTestament;
    return matchesSearch && matchesTestament;
  });

  // Group books by category for better organization
  const booksByCategory = filteredBooks.reduce((acc, book) => {
    const category = book.category || (book.testament === 'OT' ? 'Old Testament' : 'New Testament');
    if (!acc[category]) acc[category] = [];
    acc[category].push(book);
    return acc;
  }, {} as Record<string, typeof BIBLE_BOOKS>);

  // Handle book selection - goes directly to chapter 1, verse 1
  const handleBookSelect = (book: typeof BIBLE_BOOKS[0]) => {
    setReadingPosition({
      bookId: book.id,
      book: book.name,
      chapter: 1,
      verse: 1,
      timestamp: Date.now(),
      translation: readerSettings.translation,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
        style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <BookOpen size={18} style={{ color: theme.accent }} />
            <h2 className="text-lg font-bold" style={{ color: theme.text }}>Choose a Book</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80"
            style={{ backgroundColor: theme.surface }}
          >
            <X size={16} style={{ color: theme.textMuted }} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b flex-shrink-0" style={{ borderColor: theme.border }}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a book (e.g., John, Genesis, Psalms)..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
              autoFocus
            />
          </div>

          {/* Testament Filter */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setSelectedTestament('all')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedTestament === 'all' ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: selectedTestament === 'all' ? theme.accent : theme.surface,
                color: selectedTestament === 'all' ? 'white' : theme.textMuted,
              }}
            >
              All Books
            </button>
            <button
              onClick={() => setSelectedTestament('OT')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedTestament === 'OT' ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: selectedTestament === 'OT' ? theme.accent : theme.surface,
                color: selectedTestament === 'OT' ? 'white' : theme.textMuted,
              }}
            >
              Old Testament
            </button>
            <button
              onClick={() => setSelectedTestament('NT')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedTestament === 'NT' ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: selectedTestament === 'NT' ? theme.accent : theme.surface,
                color: selectedTestament === 'NT' ? 'white' : theme.textMuted,
              }}
            >
              New Testament
            </button>
          </div>
        </div>

        {/* Books List */}
        <div className="flex-1 overflow-y-auto p-3">
          {Object.entries(booksByCategory).map(([category, books]) => (
            <div key={category} className="mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2 px-2" style={{ color: theme.textMuted }}>
                {category}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {books.map(book => (
                  <button
                    key={book.id}
                    onClick={() => handleBookSelect(book)}
                    className="flex items-center justify-between p-3 rounded-xl text-left transition-all hover:opacity-80 active:scale-[0.98]"
                    style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
                  >
                    <div className="flex items-center gap-2">
                      <Scroll size={14} style={{ color: theme.accent }} />
                      <span className="text-sm font-medium" style={{ color: theme.text }}>
                        {book.name}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: theme.textFaint }}>
                      {book.chapters} ch
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {filteredBooks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search size={32} style={{ color: theme.textMuted }} />
              <p className="text-sm mt-3" style={{ color: theme.textMuted }}>No books found</p>
              <p className="text-xs mt-1" style={{ color: theme.textFaint }}>Try a different search term</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex-shrink-0" style={{ borderColor: theme.border }}>
          <p className="text-xs text-center" style={{ color: theme.textFaint }}>
            {filteredBooks.length} books available
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookNavigator;