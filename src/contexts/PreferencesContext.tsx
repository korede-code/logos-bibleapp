// src/contexts/PreferencesContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { UserPreferences } from '../api/userPreferences';

interface PreferencesContextValue {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  isSaving: boolean;
  loadPreferences: () => Promise<void>;
  updatePreference: (key: keyof UserPreferences, value: any) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  getPreference: <K extends keyof UserPreferences>(key: K, defaultValue?: UserPreferences[K]) => UserPreferences[K];
  isReady: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

interface PreferencesProviderProps {
  children: ReactNode;
  userId: string | null;
}

export function PreferencesProvider({ children, userId }: PreferencesProviderProps) {
  const hook = useUserPreferences(userId);
  const isReady = !hook.loading && !!userId;

  const value: PreferencesContextValue = {
    ...hook,
    isReady,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}