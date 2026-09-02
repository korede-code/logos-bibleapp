// src/components/FavoritesScreen.tsx
import React, { useState } from 'react';
import { ArrowLeft, Heart, BookOpen, Trash2, Edit2, X, Save } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getTheme } from '../utils/themeUtils';
import { useFavorites } from '../hooks/useFavorites';
import { BIBLE_BOOKS } from '../data/bibleData';

interface FavoritesScreenProps {
  theme?: any;
  onClose?: () => void;
  navigate?: (screen: string) => void;
}

const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ theme, onClose, navigate: propNavigate }) => {
  const { readerSettings, setReadingPosition, navigate: appNavigate } = useAppStore();
  const t = theme || getTheme(readerSettings.theme);
  const navigate = propNavigate || appNavigate;
  
  const userId = localStorage.getItem('currentUserId');
  const { favorites, loading, removeFavorite, updateNotes, count } = useFavorites(userId);
  
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  const handleRemoveFavorite = async (book: string, chapter: number, verse: number, translation?: string) => {
    if (confirm(`Remove ${book} ${chapter}:${verse} from favorites?`)) {
      try {
        await removeFavorite(book, chapter, verse, translation);
      } catch (error) {
        console.error('Failed to remove favorite:', error);
      }
    }
  };

  const handleEditNotes = (favorite: any) => {
    setEditingNotes(favorite.id);
    setNotesText(favorite.notes || '');
  };

  const handleSaveNotes = async (favoriteId: string) => {
    try {
      await updateNotes(favoriteId, notesText);
      setEditingNotes(null);
      setNotesText('');
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingNotes(null);
    setNotesText('');
  };

  const navigateToReader = (book: string, chapter: number, verse: number) => {
    const bookObj = BIBLE_BOOKS.find(b => b.name === book);
    setReadingPosition({
      book,
      bookId: bookObj?.id || 1,
      chapter,
      verse
    });
    navigate('reader');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: t.bg }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4" style={{ color: t.textMuted }}>Loading favorites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: t.bg }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${t.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('home')} style={{ color: t.textMuted }}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: t.text, fontFamily: 'Crimson Pro, serif' }}>
            My Favorites
          </h1>
          <span className="ml-auto text-sm" style={{ color: t.textMuted }}>
            {count} verses
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-16">
            <Heart size={48} style={{ color: t.textFaint }} />
            <h3 className="text-lg font-bold mt-4" style={{ color: t.text }}>
              No Favorites Yet
            </h3>
            <p className="text-sm text-center mt-2" style={{ color: t.textMuted }}>
              Start saving your favorite verses by tapping the ❤️ icon in the reader.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen size={14} style={{ color: t.accent }} />
                    <button
                      onClick={() => navigateToReader(favorite.book, favorite.chapter, favorite.verse)}
                      className="text-sm font-bold hover:underline"
                      style={{ color: t.accent }}
                    >
                      {favorite.book} {favorite.chapter}:{favorite.verse}
                    </button>
                    <span
                      className="ml-auto text-xs px-2 py-0.5 rounded"
                      style={{ backgroundColor: t.surface, color: t.textFaint }}
                    >
                      {favorite.translation}
                    </span>
                  </div>
                  
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: t.text,
                      fontFamily: `${readerSettings.fontFamily}, serif`,
                      lineHeight: 1.6
                    }}
                  >
                    "{favorite.text}"
                  </p>

                  {/* Notes Section */}
                  {editingNotes === favorite.id ? (
                    <div className="mt-3">
                      <textarea
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        className="w-full p-2 rounded-lg text-sm resize-none"
                        style={{
                          backgroundColor: t.surface,
                          color: t.text,
                          border: `1px solid ${t.border}`,
                          minHeight: '60px'
                        }}
                        placeholder="Add your personal notes..."
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleSaveNotes(favorite.id)}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
                          style={{ backgroundColor: t.accent, color: 'white' }}
                        >
                          <Save size={14} /> Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
                          style={{ backgroundColor: t.surface, color: t.textMuted }}
                        >
                          <X size={14} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : favorite.notes ? (
                    <div className="mt-3 p-2 rounded-lg" style={{ backgroundColor: `${t.accent}10` }}>
                      <p className="text-xs" style={{ color: t.textMuted }}>💭 {favorite.notes}</p>
                    </div>
                  ) : null}

                  <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${t.border}` }}>
                    <button
                      onClick={() => navigateToReader(favorite.book, favorite.chapter, favorite.verse)}
                      className="flex-1 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                      style={{ backgroundColor: `${t.accent}20`, color: t.accent }}
                    >
                      Read
                    </button>
                    <button
                      onClick={() => handleEditNotes(favorite)}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                      style={{ backgroundColor: t.surface, color: t.textMuted }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleRemoveFavorite(favorite.book, favorite.chapter, favorite.verse, favorite.translation)}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                      style={{ backgroundColor: '#e5393520', color: '#e53935' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesScreen;