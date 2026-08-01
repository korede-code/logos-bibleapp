// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useAppStore } from './store/appStore';
import { onAuthChange } from './config/firebase';
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
import { NotificationService } from './services/NotificationService';
import HighlightsScreen from './components/HighlightsScreen';

interface ScreenProps {
  theme: any;
  onClose: () => void;
  navigate: (screen: string) => void;
}

const SCREENS: Record<string, React.ComponentType<ScreenProps>> = {
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
  highlights: HighlightsScreen,
};

const App: React.FC = () => {
  const { currentScreen, readerSettings, setCurrentUser, setProStatus, navigate } = useAppStore();
  const theme = getTheme(readerSettings.theme);

  // 🔥 Capacitor listeners 
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Running on web - skipping native listeners');
      return;
    }

    if (!App || typeof App.addListener !== 'function') {
      console.error('❌ App plugin not available');
      return;
    }

    console.log('📱 Registering Capacitor listeners');

    // ✅ Keep only necessary listeners for future use
    const urlHandler = async (data: { url: string }) => {
      console.log('🔗 Deep link opened:', data.url);
      // Handle any deep links if needed (e.g., Google Play purchase verification)
    };

    const urlListener = App.addListener('appUrlOpen', urlHandler);
    console.log('✅ appUrlOpen listener registered');

    return () => {
      if (urlListener && typeof urlListener.remove === 'function') {
        urlListener.remove();
      }
    };
  }, [navigate, setProStatus]);

  // 🔥 Auth listener - Complete merged version
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      console.log('App: Auth state changed', user?.email);
    
      if (user) {
        // ✅ Store user in a persistent way
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        };
        
        localStorage.setItem('logos_user', JSON.stringify(userData));
        // ✅ Also store the UID separately for easy access
        localStorage.setItem('currentUserId', user.uid);
        
        // ✅ Set in store
        setCurrentUser(userData);
        
        // ✅ Check localStorage for Pro status
        const savedPro = localStorage.getItem(`isPro_${user.uid}`);
        console.log('📝 Saved Pro from localStorage:', savedPro);

        if (savedPro === 'true') {
          setProStatus(true);
          console.log('✅ Pro set from localStorage');
        }
        
        // ✅ Check backend for Pro status
        try {
          console.log('🔍 Checking backend Pro status for:', user.uid);
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
        
          const response = await fetch(
            `https://logos-daily-backend.onrender.com/api/payments/pro-status/${user.uid}`,
            { signal: controller.signal }
          );
          clearTimeout(timeout);
        
          const data = await response.json();
          console.log('📦 Backend Pro status response:', data);

          if (data.isPro) {
            setProStatus(true);
            localStorage.setItem(`isPro_${user.uid}`, 'true');
            localStorage.setItem('logos_daily_pro', 'true');
            console.log('✅ Pro set from backend');
          } else {
            // ✅ If backend says not Pro but we have localStorage, sync it
            if (savedPro === 'true') {
              console.log('🔄 Syncing local Pro status to backend...');
              try {
                await fetch(
                  'https://logos-daily-backend.onrender.com/api/payments/sync-revenuecat',
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: user.uid,
                      isPro: true,
                      source: 'local_storage'
                    })
                  }
                );
                console.log('✅ Synced Pro status to backend');
              } catch (syncError) {
                console.error('❌ Failed to sync Pro status:', syncError);
              }
            }
          }
        } catch (e) {
          console.log('Backend check skipped (timeout or offline)');
        }
      } else {
        // ✅ Clear user data on sign out
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('logos_user');
        // Don't remove Pro status as it's tied to the user
        console.log('👤 User signed out, cleared session data');
      }
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [setProStatus, setCurrentUser]);

  // 🔥 App focus handler for pending Pro status
  useEffect(() => {
    const handleFocus = () => {
      const pendingUserId = localStorage.getItem('pendingProUserId');
      if (pendingUserId) {
        console.log('📱 App focused, checking Pro for:', pendingUserId);
        fetch(`https://logos-daily-backend.onrender.com/api/payments/pro-status/${pendingUserId}`)
          .then(r => r.json())
          .then(data => {
            if (data.isPro) {
              localStorage.setItem(`isPro_${pendingUserId}`, 'true');
              localStorage.setItem('logos_daily_pro', 'true');
              localStorage.removeItem('pendingProUserId');
              localStorage.removeItem('pendingProPlan');
              setProStatus(true);
              console.log('✅ Pro activated!');
            }
          })
          .catch(console.error);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [setProStatus]);

  // 🔥 Notification service
  useEffect(() => {
    NotificationService.init();
  }, []);

  const ActiveScreen = SCREENS[currentScreen] ?? HomeScreen;
  const hideNav = readerSettings.focusMode && currentScreen === 'reader';

  const screenProps = {
    theme,
    onClose: () => navigate('home'),
    navigate,
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
      <div className="flex-1 overflow-hidden relative">
        <ActiveScreen
          theme={theme}
          onClose={() => navigate('home')}
          navigate={navigate}
        />
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
};

export default App;