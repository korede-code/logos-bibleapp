// src/hooks/useFavorites.ts
import { useState, useEffect, useCallback } from 'react';
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
  updateFavoriteNotes,
  FavoriteVerse
} from '../api/favorites';

export function useFavorites(userId: string | null) {
  const [favorites, setFavorites] = useState<FavoriteVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

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
    addFavorite: addFavoriteVerse,
    removeFavorite: removeFavoriteVerse,
    isFavorited,
    updateNotes,
    count: favorites.length
  };
}