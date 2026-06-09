// src/App.tsx
import React, { useEffect, useState } from 'react';
import { useAppStore } from './store/appStore';
import { onAuthChange, getUserData } from './config/firebase';
import HomeScreen from './components/HomeScreen';
import ReaderScreen from './components/ReaderScreen';
import SearchScreen from './components/SearchScreen';
import ReadingPlansScreen from './components/ReadingPlansScreen';
import NotesScreen from './components/NotesScreen';
import PrayerScreen from './components/PrayerScreen';
import ProgressScreen from './components/ProgressScreen';
import BookmarksScreen from './components/BookmarksScreen';
import GroupsScreen from './components/GroupsScreen';
import SettingsScreen from './components/SettingsScreen';
import BottomNav from './components/BottomNav';
import { getTheme } from './utils/themeUtils';

const SCREENS: Record<string, React.ComponentType> = {
  home: HomeScreen,
  reader: ReaderScreen,
  search: SearchScreen,
  plans: ReadingPlansScreen,
  notes: NotesScreen,
  prayer: PrayerScreen,
  progress: ProgressScreen,
  bookmarks: BookmarksScreen,
  groups: GroupsScreen,
  settings: SettingsScreen,
};

const App: React.FC = () => {
  const { currentScreen, readerSettings, setCurrentUser, setProStatus } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  const [loading, setLoading] = useState(true);

  // In App.tsx - Update the auth listener
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      console.log('App: Auth state changed', user?.email);
      
      if (user) {
        // Get user data from Firestore
        const userData = await getUserData(user.uid);
        const isProUser = userData?.isPro === true;
        
        setCurrentUser(user);
        setProStatus(isProUser);
        
        console.log(`🌟 App: Pro status from Firestore = ${isProUser}`);
      } else {
        setCurrentUser(null);
        setProStatus(false);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [setCurrentUser, setProStatus]);

  const ActiveScreen = SCREENS[currentScreen] ?? HomeScreen;
  const hideNav = readerSettings.focusMode && currentScreen === 'reader';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: theme.bg }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.accent }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
      <div className="flex-1 overflow-hidden relative">
        <ActiveScreen />
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
};

export default App;