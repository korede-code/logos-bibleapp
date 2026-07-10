// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app'; // 🔥 MAKE SURE THIS IS IMPORTED
import { useAppStore } from './store/appStore';
import { onAuthChange } from './config/firebase';
import HomeScreen from './components/HomeScreen';
import ReaderScreen from './components/ReaderScreen';
import SearchScreen from './components/SearchScreen';
import ReadingPlansScreen from './components/ReadingPlansScreen';
import NotesScreen from './components/NotesScreen';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentCallback from './components/PaymentCallback';
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
  'payment-success': PaymentSuccess,
  'payment-callback': PaymentCallback,  // 🔥 ADDED
  highlights: HighlightsScreen,
};

const App: React.FC = () => {
  const { currentScreen, readerSettings, setCurrentUser, setProStatus, navigate } = useAppStore();
  const theme = getTheme(readerSettings.theme);

  // 🔥 SINGLE useEffect for Capacitor listeners
  // src/App.tsx - Update the deep link handler
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

    const urlHandler = async (data: { url: string }) => {
      console.log('🔗 Deep link opened:', data.url);
    
      try {
        const url = new URL(data.url);
        const reference = url.searchParams.get('reference');
      
        if (reference) {
          console.log('💰 Payment reference found:', reference);
        
        // Navigate to payment callback
          navigate('payment-callback');
        
        // Verify payment
          const response = await fetch(
            `https://logos-daily-backend.onrender.com/api/payments/verify/${reference}`
          );
          const result = await response.json();
        
          console.log('Verification result:', result);
        
          if (result.success && result.verified) {
            const userId = localStorage.getItem('pendingProUserId');
            if (userId) {
              localStorage.setItem(`isPro_${userId}`, 'true');
              localStorage.setItem('logos_daily_pro', 'true');
              localStorage.removeItem('pendingProUserId');
              localStorage.removeItem('pendingProPlan');
              setProStatus(true);
              console.log('✅ Pro status activated!');
            }
          }
        }
      } catch (error) {
        console.error('❌ Error handling deep link:', error);
      }
    };

    const urlListener = App.addListener('appUrlOpen', urlHandler);
    console.log('✅ appUrlOpen listener registered');

    return () => {
      if (urlListener && typeof urlListener.remove === 'function') {
        urlListener.remove();
      }
    };
  }, [navigate, setProStatus]);

  // 🔥 SINGLE useEffect for payment callback detection (web)
 /*
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    
    if (reference && reference.startsWith('LOGOS_')) {
      console.log('🔍 Payment callback detected:', reference);
      
      // Navigate to payment callback screen
      navigate('payment-callback');
      
      // Verify payment
      fetch(`https://logos-daily-backend.onrender.com/api/payments/verify/${reference}`)
        .then(r => r.json())
        .then(data => {
          console.log('Verification result:', data);
          if (data.success && data.verified) {
            const userId = localStorage.getItem('pendingProUserId');
            if (userId) {
              localStorage.setItem(`isPro_${userId}`, 'true');
              localStorage.setItem('logos_daily_pro', 'true');
              localStorage.removeItem('pendingProUserId');
              localStorage.removeItem('pendingProPlan');
              setProStatus(true);
            }
          }
        })
        .catch(console.error);
    }
  }, [navigate, setProStatus]);
 */

  // 🔥 Auth listener
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      console.log('App: Auth state changed', user?.email);
    
      if (user) {
        localStorage.setItem('logos_user', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }));
      
        const savedPro = localStorage.getItem(`isPro_${user.uid}`);
        console.log('📝 Saved Pro from localStorage:', savedPro);

        if (savedPro === 'true') {
          setProStatus(true);
          console.log('✅ Pro set from localStorage');
        }
         
        // Then check backend
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
          }
        } catch (e) {
          console.log('Backend check skipped (timeout or offline)');
        }
      }
    });
  
    return () => unsubscribe();
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