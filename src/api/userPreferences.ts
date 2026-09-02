// src/api/userPreferences.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000/api';

export interface UserPreferences {
  translation: string;
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  theme: 'light' | 'dark' | 'system';
  showVerseNumbers: boolean;
  autoPlayAudio: boolean;
  readingPlan: string | null;
  dailyReminder: boolean;
  reminderTime: string;
  updatedAt?: string;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  translation: 'KJV',
  fontSize: 'medium',
  theme: 'light',
  showVerseNumbers: true,
  autoPlayAudio: false,
  readingPlan: null,
  dailyReminder: false,
  reminderTime: '09:00'
};

// ✅ NO /api in the path - it's already in the base URL
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  try {
    const url = `${API_BASE_URL}/users/${userId}/preferences`;
    console.log('📡 GET preferences:', url);
    
    const response = await fetch(url);
    
    // Log the status
    console.log('📡 Response status:', response.status);
    console.log('📡 Response OK?', response.ok);
    
    // Try to get the response as text first for debugging
    const responseText = await response.text();
    console.log('📡 Response text:', responseText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }
    
    // Parse the response
    const data = JSON.parse(responseText);
    console.log('📡 Parsed data:', data);
    
    return data.data || DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('❌ Error getting preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

// ✅ NO /api in the path
export async function saveUserPreferences(
  userId: string, 
  preferences: Partial<UserPreferences>
): Promise<UserPreferences> {
  try {
    const url = `${API_BASE_URL}/users/${userId}/preferences`;
    console.log('📡 PUT preferences:', url);
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(preferences)
    });
    
    // ✅ Read as text first to handle non-JSON responses
    const responseText = await response.text();
    console.log('📡 PUT Response status:', response.status);
    console.log('📡 PUT Response text:', responseText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }
    
    // ✅ Parse only if we have content
    if (!responseText || responseText.trim() === '') {
      throw new Error('Empty response from server');
    }
    
    const data = JSON.parse(responseText);
    return data.data || DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('❌ Error saving preferences:', error);
    throw error;
  }
}

// ✅ NO /api in the path
export async function resetPreferences(userId: string): Promise<UserPreferences> {
  try {
    const url = `${API_BASE_URL}/users/${userId}/preferences`;
    console.log('📡 DELETE preferences:', url);
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    const responseText = await response.text();
    console.log('📡 DELETE Response status:', response.status);
    console.log('📡 DELETE Response text:', responseText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }
    
    if (!responseText || responseText.trim() === '') {
      throw new Error('Empty response from server');
    }
    
    const data = JSON.parse(responseText);
    return data.data || DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('❌ Error resetting preferences:', error);
    throw error;
  }
}

export async function updatePreference(
  userId: string, 
  key: keyof UserPreferences, 
  value: any
): Promise<UserPreferences> {
  return saveUserPreferences(userId, { [key]: value });
}