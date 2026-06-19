// src/App.tsx
import React, { useEffect, useState } from 'react';
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
  const { currentScreen, readerSettings } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  const [loading, setLoading] = useState(false); // ✅ Start as false, not true

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      console.log('App: Auth state changed', user?.email);
    
      if (user) {
        // Save user immediately (don't wait for backend)
        localStorage.setItem('logos_user', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }));
      
        // Check localStorage first (instant)
        const savedPro = localStorage.getItem(`isPro_${user.uid}`);
        if (savedPro !== null) {
          useAppStore.getState().setProStatus(savedPro === 'true');
        }
      
        // Try backend with timeout (don't block)
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
        
          const response = await fetch(
            `https://logos-daily-backend.onrender.com/api/payments/pro-status/${user.uid}`,
            { signal: controller.signal }
          );
          clearTimeout(timeout);
        
          const data = await response.json();
          if (data.isPro) {
            useAppStore.getState().setProStatus(true);
            localStorage.setItem(`isPro_${user.uid}`, 'true');
            localStorage.setItem('logos_daily_pro', 'true');
          }
        } catch (e) {
          console.log('Backend check skipped (timeout or offline)');
        }
      }
    });
  
    return () => unsubscribe();
  }, []);


  // In App.tsx or PaymentCallback.tsx
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    const trxref = params.get('trxref');
    const paymentRef = reference || trxref;
  
    if (paymentRef && paymentRef.startsWith('LOGOS_')) {
      console.log('🔍 Verifying payment:', paymentRef);
    
      fetch(`https://logos-daily-backend.onrender.com/api/payments/verify/${paymentRef}`)
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
            }
            useAppStore.getState().setProStatus(true);
          }
        })
        .catch(console.error);
    }
  }, []);

  // src/App.tsx - Add at the top with other imports


  // Inside the App component, add this useEffect with the others:
  useEffect(() => {
    // Only run on native devices
    const isNative = (window as any).Capacitor?.isNativePlatform();
    if (!isNative) return;

    App.addListener('appUrlOpen', (data: any) => {
      console.log('App opened with URL:', data.url);
    
      if (data.url.includes('payment-success') || data.url.includes('reference=')) {
        const url = new URL(data.url);
        const reference = url.searchParams.get('reference');
      
        if (reference) {
          verifyAndActivatePro(reference);
        }
      }
    });

    // Also check on app resume
    const handleResume = () => {
      const pendingUserId = localStorage.getItem('pendingProUserId');
      if (pendingUserId) {
        fetch(`https://logos-daily-backend.onrender.com/api/payments/pro-status/${pendingUserId}`)
          .then(r => r.json())
          .then(data => {
            if (data.isPro) {
              localStorage.setItem(`isPro_${pendingUserId}`, 'true');
              localStorage.setItem('logos_daily_pro', 'true');
              localStorage.removeItem('pendingProUserId');
              useAppStore.getState().setProStatus(true);
            }
          });
      }
    };

    document.addEventListener('resume', handleResume);
    return () => {
      document.removeEventListener('resume', handleResume);
    };
  }, []);

  // Add this function outside the component (at the bottom of App.tsx):
  async function verifyAndActivatePro(reference: string) {
    try {
      const response = await fetch(
        `https://logos-daily-backend.onrender.com/api/payments/verify/${reference}`
      );
      const data = await response.json();
    
      if (data.success) {
        const userId = localStorage.getItem('pendingProUserId');
        if (userId) {
          localStorage.setItem(`isPro_${userId}`, 'true');
          localStorage.setItem('logos_daily_pro', 'true');
          localStorage.removeItem('pendingProUserId');
          localStorage.removeItem('pendingProPlan');
          useAppStore.getState().setProStatus(true);
        }
      }
    } catch (e) {
      console.error('Deep link verification error:', e);
    }
  }

  const ActiveScreen = SCREENS[currentScreen] ?? HomeScreen;
  const hideNav = readerSettings.focusMode && currentScreen === 'reader';

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