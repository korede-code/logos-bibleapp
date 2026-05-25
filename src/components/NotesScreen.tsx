/**
 * Logos Daily — Notes Screen
 * ============================
 * Manage your personal Bible study notes with:
 * - Verse context from Bible API
 * - Tags and categorization
 * - Edit and delete functionality
 * - Offline support
 */

import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useBibleVerse } from '../hooks/useRealBibleData';
import { getTheme } from '../utils/themeUtils';
import { 
  ArrowLeft, 
  BookOpen, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  Plus,
  Search,
  Filter,
  X,
  Loader2,
  WifiOff,
  CheckCircle,
  Tag,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

const NotesScreen: React.FC = () => {
  const { readerSettings, notes, navigate, setReadingPosition, deleteNote } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Get unique tags from all notes
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || [])));

  // Filter notes by search and tag
  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchQuery === '' || 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${note.book} ${note.chapter}:${note.verse}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = !selectedTag || (note.tags || []).includes(selectedTag);
    
    return matchesSearch && matchesTag;
  });

  // Group notes by book
  const groupedNotes = filteredNotes.reduce((acc, note) => {
    const key = `${note.book} ${note.chapter}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(note);
    return acc;
  }, {} as Record<string, typeof notes>);

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
              My Notes
            </h1>
          </div>
          <button
            onClick={() => navigate('reader')}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: theme.accent }}
            aria-label="Add new note"
          >
            <Plus size={18} style={{ color: 'white' }} />
          </button>
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
            placeholder="Search notes by title, content, or verse..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: theme.text }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ color: theme.textMuted }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedTag(null)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                backgroundColor: !selectedTag ? theme.accent : theme.surface,
                color: !selectedTag ? 'white' : theme.textMuted,
              }}
            >
              All Notes
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  backgroundColor: selectedTag === tag ? theme.accent : theme.surface,
                  color: selectedTag === tag ? 'white' : theme.textMuted,
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Results count */}
        {searchQuery || selectedTag ? (
          <p className="text-xs mt-2 pl-1" style={{ color: theme.textMuted }}>
            {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'} found
          </p>
        ) : (
          <p className="text-xs mt-2 pl-1" style={{ color: theme.textMuted }}>
            {notes.length} total {notes.length === 1 ? 'note' : 'notes'}
          </p>
        )}
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="text-5xl">📝</div>
            <div className="text-center">
              <p className="font-bold mb-1" style={{ color: theme.text }}>No notes yet</p>
              <p className="text-sm" style={{ color: theme.textMuted }}>
                {searchQuery || selectedTag 
                  ? 'Try a different search or filter' 
                  : 'Start adding notes while reading Scripture'}
              </p>
            </div>
            {!searchQuery && !selectedTag && (
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
          Object.entries(groupedNotes).map(([chapterRef, chapterNotes]) => (
            <div key={chapterRef}>
              <h2 className="text-sm font-bold mb-3" style={{ color: theme.accent }}>
                {chapterRef}
              </h2>
              <div className="space-y-3">
                {chapterNotes.map(note => (
                  <NoteCard 
                    key={note.id} 
                    note={note} 
                    theme={theme} 
                    navigate={navigate} 
                    setReadingPosition={setReadingPosition} 
                    deleteNote={deleteNote} 
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

// NoteCard Component with Bible API Integration
const NoteCard: React.FC<{ 
  note: any; 
  theme: any; 
  navigate: any; 
  setReadingPosition: any; 
  deleteNote: any;
}> = ({ note, theme, navigate, setReadingPosition, deleteNote }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Fetch the actual verse text from API
  const { verse, isLoading, isOffline, error } = useBibleVerse(
    note.book,
    note.chapter,
    note.verse,
    'KJV'
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteNote(note.id);
    setIsDeleting(false);
  };

  const handleEdit = () => {
    navigate('reader');
    setReadingPosition({
      book: note.book,
      bookId: note.bookId,
      chapter: note.chapter,
      verse: note.verse,
    });
  };

  const handleVerseClick = () => {
    setReadingPosition({
      book: note.book,
      bookId: note.bookId,
      chapter: note.chapter,
      verse: note.verse,
    });
    navigate('reader');
  };

  return (
    <div 
      className="rounded-2xl p-4 transition-all relative"
      style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <button
          onClick={handleVerseClick}
          className="flex items-center gap-2 group"
        >
          <BookOpen size={14} style={{ color: theme.accent }} />
          <span className="text-sm font-bold" style={{ color: theme.accent }}>
            {note.book} {note.chapter}:{note.verse}
          </span>
        </button>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg transition-all"
            style={{ color: theme.textMuted }}
          >
            <MoreVertical size={14} />
          </button>
          
          {showMenu && (
            <div 
              className="absolute right-0 top-8 z-10 rounded-xl shadow-lg overflow-hidden min-w-[120px]"
              style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
            >
              <button
                onClick={handleEdit}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:opacity-80 transition-all"
                style={{ color: theme.text }}
              >
                <Edit2 size={12} />
                Edit Note
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:opacity-80 transition-all"
                style={{ color: '#dc2626' }}
              >
                {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Verse Text from API */}
      {isLoading ? (
        <div className="mb-3 p-2 rounded-lg" style={{ backgroundColor: theme.surface }}>
          <div className="flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" style={{ color: theme.accent }} />
            <span className="text-xs" style={{ color: theme.textMuted }}>Loading verse...</span>
          </div>
        </div>
      ) : error ? (
        <div className="mb-3 p-2 rounded-lg" style={{ backgroundColor: `${theme.accent}10` }}>
          <p className="text-xs" style={{ color: theme.accent }}>Unable to load verse</p>
        </div>
      ) : verse && (
        <div 
          className="mb-3 p-2 rounded-lg cursor-pointer hover:opacity-80 transition-all"
          style={{ backgroundColor: theme.surface }}
          onClick={handleVerseClick}
        >
          <p className="text-xs italic leading-relaxed" style={{ color: theme.textMuted }}>
            "{verse.text.substring(0, 120)}{verse.text.length > 120 ? '...' : ''}"
          </p>
        </div>
      )}

      {/* Note Title */}
      <h3 className="font-bold text-sm mb-1" style={{ color: theme.text }}>
        {note.title}
      </h3>
      
      {/* Note Content */}
      <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>
        {note.content}
      </p>

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {note.tags.map((tag: string) => (
            <span 
              key={tag} 
              className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
              style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
            >
              <Tag size={10} />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer with date and offline indicator */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor: theme.border }}>
        <div className="flex items-center gap-2">
          <Calendar size={10} style={{ color: theme.textFaint }} />
          <span className="text-xs" style={{ color: theme.textFaint }}>
            {format(new Date(note.createdAt), 'MMM d, yyyy')}
          </span>
        </div>
        {isOffline && !isLoading && (
          <div className="flex items-center gap-1">
            <WifiOff size={10} style={{ color: '#f59e0b' }} />
            <span className="text-xs" style={{ color: '#f59e0b' }}>Offline</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesScreen;