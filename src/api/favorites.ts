// src/api/favorites.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000/api';

export interface FavoriteVerse {
  id: string;
  book: string;
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
  translation: string;
  notes: string;
  dateAdded: string;
  dateModified: string;
}

// ✅ NO /api in any of these URLs
export async function getFavorites(userId: string): Promise<FavoriteVerse[]> {
  try {
    const url = `${API_BASE_URL}/users/${userId}/favorites`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get favorites');
    }
    return data.data || [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
}

export async function addFavorite(
  userId: string, 
  verse: Omit<FavoriteVerse, 'id' | 'dateAdded' | 'dateModified'>
): Promise<FavoriteVerse> {
  try {
    const url = `${API_BASE_URL}/users/${userId}/favorites`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(verse)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to add favorite');
    }
    return data.data;
  } catch (error) {
    console.error('Error adding favorite:', error);
    throw error;
  }
}

export async function removeFavorite(
  userId: string, 
  book: string, 
  chapter: number, 
  verse: number, 
  translation?: string
): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      book,
      chapter: chapter.toString(),
      verse: verse.toString()
    });
    if (translation) params.append('translation', translation);
    
    const url = `${API_BASE_URL}/users/${userId}/favorites?${params}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to remove favorite');
    }
    return data.success;
  } catch (error) {
    console.error('Error removing favorite:', error);
    throw error;
  }
}

export async function checkFavorite(
  userId: string, 
  book: string, 
  chapter: number, 
  verse: number, 
  translation?: string
): Promise<{ isFavorited: boolean; favorite: FavoriteVerse | null }> {
  try {
    const params = new URLSearchParams({
      book,
      chapter: chapter.toString(),
      verse: verse.toString()
    });
    if (translation) params.append('translation', translation);
    
    const url = `${API_BASE_URL}/users/${userId}/favorites/check?${params}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to check favorite');
    }
    return {
      isFavorited: data.isFavorited || false,
      favorite: data.favorite || null
    };
  } catch (error) {
    console.error('Error checking favorite:', error);
    return { isFavorited: false, favorite: null };
  }
}

export async function updateFavoriteNotes(
  userId: string, 
  favoriteId: string, 
  notes: string
): Promise<FavoriteVerse> {
  try {
    const url = `${API_BASE_URL}/users/${userId}/favorites/${favoriteId}/notes`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({ notes })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update notes');
    }
    return data.data;
  } catch (error) {
    console.error('Error updating notes:', error);
    throw error;
  }
}

export interface BulkFavoriteResult {
  success: boolean;
  message: string;
  data: FavoriteVerse[];
  addedCount: number;
  alreadyExist: string[];
  totalFavorites: number;
}

// Add multiple verses at once
export async function addBulkFavorites(
  userId: string, 
  verses: Array<Omit<FavoriteVerse, 'id' | 'dateAdded' | 'dateModified'>>
): Promise<BulkFavoriteResult> {
  try {
    const url = `${API_BASE_URL}/users/${userId}/favorites/bulk`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({ verses })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to add favorites');
    }
    return data;
  } catch (error) {
    console.error('Error adding bulk favorites:', error);
    throw error;
  }
}

// Remove multiple verses at once
export async function removeBulkFavorites(
  userId: string, 
  verses: Array<{ book: string; chapter: number; verse: number; translation?: string }>
): Promise<BulkFavoriteResult> {
  try {
    const url = `${API_BASE_URL}/users/${userId}/favorites/bulk`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({ verses })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to remove favorites');
    }
    return data;
  } catch (error) {
    console.error('Error removing bulk favorites:', error);
    throw error;
  }
}