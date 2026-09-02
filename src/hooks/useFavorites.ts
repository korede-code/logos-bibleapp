// src/hooks/useFavorites.ts
import { useState, useEffect, useCallback } from 'react';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
  updateFavoriteNotes,
  addBulkFavorites,
  removeBulkFavorites,
  FavoriteVerse,
  BulkFavoriteResult
} from '../api/favorites';

export function useFavorites(userId: string | null) {
  const [favorites, setFavorites] = useState<FavoriteVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Load favorites from API
  const loadFavorites = useCallback(async () => {
    if (!userId) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const data = await getFavorites(userId);
      setFavorites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Add single favorite
  const addFavoriteVerse = useCallback(async (
    verse: Omit<FavoriteVerse, 'id' | 'dateAdded' | 'dateModified'>
  ) => {
    if (!userId) {
      throw new Error('User not logged in');
    }
    
    setIsAdding(true);
    setError(null);
    try {
      const newFavorite = await addFavorite(userId, verse);
      setFavorites(prev => [...prev, newFavorite]);
      return newFavorite;
    } catch (err) {
      // Handle duplicate favorite gracefully
      if (err instanceof Error && err.message.includes('already in favorites')) {
        console.log('Verse already in favorites');
        return null;
      }
      setError(err instanceof Error ? err.message : 'Failed to add favorite');
      throw err;
    } finally {
      setIsAdding(false);
    }
  }, [userId]);

  // Remove single favorite
  const removeFavoriteVerse = useCallback(async (
    book: string,
    chapter: number,
    verse: number,
    translation?: string
  ) => {
    if (!userId) {
      throw new Error('User not logged in');
    }
    
    setIsRemoving(true);
    setError(null);
    try {
      await removeFavorite(userId, book, chapter, verse, translation);
      setFavorites(prev => prev.filter(f => 
        !(f.book === book && 
          f.chapter === chapter && 
          f.verse === verse &&
          f.translation === (translation || f.translation))
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove favorite');
      throw err;
    } finally {
      setIsRemoving(false);
    }
  }, [userId]);

  // ✅ Add bulk favorites (NEW)
  const addBulkFavoritesVerse = useCallback(async (
    verses: Array<Omit<FavoriteVerse, 'id' | 'dateAdded' | 'dateModified'>>
  ): Promise<BulkFavoriteResult> => {
    if (!userId) {
      throw new Error('User not logged in');
    }
    
    setIsAdding(true);
    setError(null);
    try {
      const result = await addBulkFavorites(userId, verses);
      // Refresh favorites list
      await loadFavorites();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add favorites');
      throw err;
    } finally {
      setIsAdding(false);
    }
  }, [userId, loadFavorites]);

  // ✅ Remove bulk favorites (NEW)
  const removeBulkFavoritesVerse = useCallback(async (
    verses: Array<{ book: string; chapter: number; verse: number; translation?: string }>
  ): Promise<{ success: boolean; message: string; removedCount: number; totalFavorites: number }> => {
    if (!userId) {
      throw new Error('User not logged in');
    }
    
    setIsRemoving(true);
    setError(null);
    try {
      const result = await removeBulkFavorites(userId, verses);
      // Refresh favorites list
      await loadFavorites();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove favorites');
      throw err;
    } finally {
      setIsRemoving(false);
    }
  }, [userId, loadFavorites]);

  // Check if a verse is favorited
  const isFavorited = useCallback(async (
    book: string,
    chapter: number,
    verse: number,
    translation?: string
  ): Promise<boolean> => {
    if (!userId) return false;
    
    try {
      const result = await checkFavorite(userId, book, chapter, verse, translation);
      return result.isFavorited;
    } catch (err) {
      console.error('Error checking favorite:', err);
      return false;
    }
  }, [userId]);

  // Update notes for a favorite
  const updateNotes = useCallback(async (favoriteId: string, notes: string) => {
    if (!userId) {
      throw new Error('User not logged in');
    }
    
    try {
      const updated = await updateFavoriteNotes(userId, favoriteId, notes);
      setFavorites(prev => prev.map(f => 
        f.id === favoriteId ? updated : f
      ));
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update notes');
      throw err;
    }
  }, [userId]);

  // Load favorites on mount
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return {
    favorites,
    loading,
    error,
    isAdding,
    isRemoving,
    loadFavorites,
    // Single verse methods
    addFavorite: addFavoriteVerse,
    removeFavorite: removeFavoriteVerse,
    // Bulk methods (NEW)
    addBulkFavorites: addBulkFavoritesVerse,
    removeBulkFavorites: removeBulkFavoritesVerse,
    // Utility methods
    isFavorited,
    updateNotes,
    count: favorites.length
  };
}