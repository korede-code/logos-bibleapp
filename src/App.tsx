// src/App.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useAppStore } from './store/appStore';
import { onAuthChange } from './config/firebase';

// ✅ UNCOMMENT ALL THESE IMPORTS
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

console.log('✅ HomeScreen:', HomeScreen);
console.log('✅ ReaderScreen:', ReaderScreen);
console.log('✅ BottomNav:', BottomNav);

type AppScreen =
  | 'home'
  | 'reader'
  | 'search'
  | 'plans'
  | 'notes'
  | 'prayer'
  | 'progress'
  | 'bookmarks'
  | 'groups'
  | 'settings'
  | 'highlights';

interface ScreenProps {
  theme: any;
  onClose: () => void;
  navigate: (screen: AppScreen) => void;
}

const SCREENS: Record<AppScreen, React.ComponentType<ScreenProps>> = {
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
  // ✅ ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURN
  const { currentScreen, readerSettings, setCurrentUser, setProStatus, navigate } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  
  // ✅ Use a ref to track render count without causing re-renders
  const renderCount = useRef(0);
  renderCount.current += 1;
  
  // ✅ Track if this is the first render
  const isFirstRender = useRef(true);
  
  // ✅ Store the loop detection state in state (not in render)
  const [hasLoopError, setHasLoopError] = useState(false);

  // ✅ ALL useEffects must be called before any conditional return
  useEffect(() => {
    if (renderCount.current > 10 && isFirstRender.current) {
      isFirstRender.current = false;
      setHasLoopError(true);
      console.warn('⚠️ Infinite render loop detected!');
    }
  }, []);

  // ✅ Capacitor listeners
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      console.log('🌐 Running on web - skipping native listeners');
      return;
    }

    if (!CapacitorApp || typeof CapacitorApp.addListener !== 'function') {
      console.error('❌ App plugin not available');
      return;
    }

    console.log('📱 Registering Capacitor listeners');

    const urlHandler = async (data: { url: string }) => {
      console.log('🔗 Deep link opened:', data.url);
    };

    const urlListener = CapacitorApp.addListener('appUrlOpen', urlHandler);
    console.log('✅ appUrlOpen listener registered');

    return () => {
      if (urlListener && typeof urlListener.remove === 'function') {
        urlListener.remove();
      }
    };
  }, [navigate, setProStatus]);

  // 🔥 Auth listener
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      console.log('App: Auth state changed', user?.email);
    
      if (user) {
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        };
        
        localStorage.setItem('logos_user', JSON.stringify(userData));
        localStorage.setItem('currentUserId', user.uid);
        setCurrentUser(userData);
        
        const savedPro = localStorage.getItem(`isPro_${user.uid}`);
        console.log('📝 Saved Pro from localStorage:', savedPro);

        if (savedPro === 'true') {
          setProStatus(true);
          console.log('✅ Pro set from localStorage');
        }
        
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
          } else if (savedPro === 'true') {
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
        } catch (e) {
          console.log('Backend check skipped (timeout or offline)');
        }
      } else {
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('logos_user');
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

  // ✅ DEBUG: Log render count (but don't cause infinite loop)
  console.log(`🔄 App render #${renderCount.current}`);

  // ✅ CHECK FOR LOOP ERROR AFTER ALL HOOKS
  if (hasLoopError) {
    return (
      <div style={{ padding: 20, color: 'white', background: '#1a1a2e', minHeight: '100vh' }}>
        <h2>⚠️ Render Loop Detected</h2>
        <p>The app detected an infinite render loop. Please refresh.</p>
        <p style={{ fontSize: 12, opacity: 0.6 }}>Render count: {renderCount.current}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{ padding: '10px 20px', background: '#488AFF', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          Refresh App
        </button>
      </div>
    );
  }

  console.log('🚀 App component rendering...');
  console.log('📱 Current screen:', currentScreen);

  // ✅ Check if ActiveScreen is defined
  const ActiveScreen = SCREENS[currentScreen] ?? HomeScreen;
  
  if (!ActiveScreen) {
    console.error('❌ ActiveScreen is undefined for screen:', currentScreen);
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: theme.bg,
        color: theme.text
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>⚠️ Screen Not Found</h2>
          <p style={{ color: theme.textMuted }}>The screen "{currentScreen}" could not be loaded.</p>
          <button 
            onClick={() => navigate('home')}
            style={{
              marginTop: '16px',
              padding: '10px 24px',
              backgroundColor: theme.accent,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

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