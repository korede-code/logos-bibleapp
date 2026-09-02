// src/hooks/useUserPreferences.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getUserPreferences, 
  saveUserPreferences, 
  updatePreference,
  resetPreferences,
  UserPreferences,
  DEFAULT_PREFERENCES
} from '../api/userPreferences';

const CACHE_KEY = 'user_preferences_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface UseUserPreferencesReturn {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  isSaving: boolean;
  loadPreferences: (forceRefresh?: boolean) => Promise<void>;
  updatePreference: (key: keyof UserPreferences, value: any) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  getPreference: <K extends keyof UserPreferences>(key: K, defaultValue?: UserPreferences[K]) => UserPreferences[K];
}

export function useUserPreferences(userId: string | null): UseUserPreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isFirstLoad = useRef(true);

  // Load preferences with caching
  const loadPreferences = useCallback(async (forceRefresh = false) => {
    if (!userId) {
      setPreferences(DEFAULT_PREFERENCES);
      setLoading(false);
      return;
    }
    
    // Check cache first (unless forced refresh)
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(`${CACHE_KEY}_${userId}`);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setPreferences(data);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // Cache read failed, continue to fetch
      }
    }
    
    setLoading(true);
    setError(null);
    try {
      const data = await getUserPreferences(userId);
      setPreferences(data);
      // Cache the result
      try {
        localStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      } catch (e) {
        // Cache write failed - ignore
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Update a single preference
  const updateSinglePreference = useCallback(async (key: keyof UserPreferences, value: any) => {
    if (!userId) return;
    
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updatePreference(userId, key, value);
      setPreferences(prev => ({ 
        ...(prev || DEFAULT_PREFERENCES), 
        ...updated 
      }));
      // Update cache after successful update
      try {
        localStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify({
          data: { ...(preferences || DEFAULT_PREFERENCES), ...updated },
          timestamp: Date.now()
        }));
      } catch (e) {
        // Cache write failed - ignore
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preference');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [userId, preferences]);

  // Update multiple preferences
  const updateMultiplePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!userId) return;
    
    setIsSaving(true);
    setError(null);
    try {
      const updated = await saveUserPreferences(userId, updates);
      setPreferences(prev => ({ 
        ...(prev || DEFAULT_PREFERENCES), 
        ...updated 
      }));
      // Update cache after successful update
      try {
        localStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify({
          data: { ...(preferences || DEFAULT_PREFERENCES), ...updated },
          timestamp: Date.now()
        }));
      } catch (e) {
        // Cache write failed - ignore
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [userId, preferences]);

  // Reset preferences
  const resetUserPreferences = useCallback(async () => {
    if (!userId) return;
    
    setIsSaving(true);
    setError(null);
    try {
      const defaults = await resetPreferences(userId);
      setPreferences(defaults);
      // Update cache after successful reset
      try {
        localStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify({
          data: defaults,
          timestamp: Date.now()
        }));
      } catch (e) {
        // Cache write failed - ignore
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset preferences');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [userId]);

  // Get a specific preference with default
  const getPreference = useCallback(<K extends keyof UserPreferences>(
    key: K, 
    defaultValue?: UserPreferences[K]
  ): UserPreferences[K] => {
    return (preferences?.[key] ?? defaultValue ?? DEFAULT_PREFERENCES[key]) as UserPreferences[K];
  }, [preferences]);

  // Load preferences on mount and when userId changes
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    error,
    isSaving,
    loadPreferences,
    updatePreference: updateSinglePreference,
    updatePreferences: updateMultiplePreferences,
    resetPreferences: resetUserPreferences,
    getPreference
  };
}