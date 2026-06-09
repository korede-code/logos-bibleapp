// src/components/NotesScreen.tsx
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
  Calendar,
  Save,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

const NotesScreen: React.FC = () => {
  const { readerSettings, notes, navigate, setReadingPosition, deleteNote, saveNote } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    tags: [] as string[],
    book: '',
    chapter: 0,
    verse: 0,
    bookId: 0
  });
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

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

  const handleAddNote = () => {
    setEditingNote(null);
    setNewNote({
      title: '',
      content: '',
      tags: [],
      book: '',
      chapter: 0,
      verse: 0,
      bookId: 0
    });
    setShowAddNote(true);
  };

  const handleEditNote = (note: any) => {
    setEditingNote(note);
    setNewNote({
      title: note.title,
      content: note.content,
      tags: note.tags || [],
      book: note.book,
      chapter: note.chapter,
      verse: note.verse,
      bookId: note.bookId
    });
    setShowAddNote(true);
  };

  const handleSaveNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) {
      alert('Please add a title and content for your note');
      return;
    }

    setSaving(true);
    
    if (editingNote) {
      // Update existing note
      useAppStore.getState().updateNote(editingNote.id, {
        title: newNote.title,
        content: newNote.content,
        tags: newNote.tags
      });
    } else {
      // Create new note
      saveNote({
        bookId: newNote.bookId || 43,
        book: newNote.book || 'John',
        chapter: newNote.chapter || 3,
        verse: newNote.verse || 16,
        title: newNote.title,
        content: newNote.content,
        tags: newNote.tags
      });
    }
    
    setSaving(false);
    setShowAddNote(false);
    showToast(editingNote ? 'Note updated!' : 'Note added!', '#4CAF50');
  };

  const handleAddTag = () => {
    if (newTag.trim() && !newNote.tags.includes(newTag.trim())) {
      setNewNote({
        ...newNote,
        tags: [...newNote.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewNote({
      ...newNote,
      tags: newNote.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const showToast = (message: string, bgColor: string) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: ${bgColor}; color: white; padding: 10px 20px;
      border-radius: 10px; z-index: 1000; font-size: 14px;
      animation: fadeInUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
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
              My Notes
            </h1>
          </div>
          {/* Add Note Button */}
          <button
            onClick={handleAddNote}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
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
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                !selectedTag ? 'text-white' : ''
              }`}
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
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedTag === tag ? 'text-white' : ''
                }`}
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
        {(searchQuery || selectedTag) && (
          <p className="text-xs mt-2 pl-1" style={{ color: theme.textMuted }}>
            {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'} found
          </p>
        )}
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {filteredNotes.length === 0 && !showAddNote ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="text-5xl">📝</div>
            <div className="text-center">
              <p className="font-bold mb-1" style={{ color: theme.text }}>No notes yet</p>
              <p className="text-sm" style={{ color: theme.textMuted }}>
                Tap the + button to add your first note
              </p>
            </div>
            <button
              onClick={handleAddNote}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: theme.accent, color: 'white' }}
            >
              Create Note
            </button>
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
                    onEdit={() => handleEditNote(note)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        <div className="h-20" />
      </div>

      {/* Add/Edit Note Modal */}
      {showAddNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div
            className="relative w-full max-w-md rounded-2xl overflow-hidden max-h-[85vh] flex flex-col"
            style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
          >
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.border }}>
              <h2 className="text-lg font-bold" style={{ color: theme.text }}>
                {editingNote ? 'Edit Note' : 'New Note'}
              </h2>
              <button onClick={() => setShowAddNote(false)} style={{ color: theme.textMuted }}>
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Scripture Reference */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.textMuted }}>
                  Scripture Reference (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Book"
                    value={newNote.book}
                    onChange={(e) => setNewNote({ ...newNote, book: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
                  />
                  <input
                    type="number"
                    placeholder="Chapter"
                    value={newNote.chapter || ''}
                    onChange={(e) => setNewNote({ ...newNote, chapter: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
                  />
                  <input
                    type="number"
                    placeholder="Verse"
                    value={newNote.verse || ''}
                    onChange={(e) => setNewNote({ ...newNote, verse: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.textMuted }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
                  placeholder="e.g., God's Love Revealed"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.textMuted }}>
                  Content *
                </label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                  style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
                  placeholder="Write your thoughts, insights, or observations..."
                  rows={8}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.textMuted }}>
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newNote.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                      style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
                    >
                      #{tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:opacity-70">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
                    placeholder="Add a tag..."
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-2 rounded-xl text-sm font-medium"
                    style={{ backgroundColor: theme.accent, color: 'white' }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t" style={{ borderColor: theme.border }}>
              <button
                onClick={handleSaveNote}
                disabled={saving}
                className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                style={{ backgroundColor: theme.accent, color: 'white' }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingNote ? 'Update Note' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// NoteCard Component
const NoteCard: React.FC<{ 
  note: any; 
  theme: any; 
  navigate: any; 
  setReadingPosition: any; 
  deleteNote: any;
  onEdit: () => void;
}> = ({ note, theme, navigate, setReadingPosition, deleteNote, onEdit }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { verse, isLoading, isOffline, error } = useBibleVerse(
    note.book,
    note.chapter,
    note.verse,
    'KJV'
  );

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this note?')) {
      setIsDeleting(true);
      await deleteNote(note.id);
      setIsDeleting(false);
    }
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
                onClick={() => {
                  setShowMenu(false);
                  onEdit();
                }}
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

      {/* Verse Text Preview */}
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

      <h3 className="font-bold text-sm mb-1" style={{ color: theme.text }}>
        {note.title}
      </h3>
      
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