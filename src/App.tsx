// src/App.tsx
import React, { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAppStore } from './store/appStore';
import { onAuthChange } from './config/firebase';
import HomeScreen from './components/HomeScreen';
import ReaderScreen from './components/ReaderScreen';
import SearchScreen from './components/SearchScreen';
import ReadingPlansScreen from './components/ReadingPlansScreen';
import NotesScreen from './components/NotesScreen';
import PaymentSuccess from './components/PaymentSuccess';
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
  highlights: HighlightsScreen,
};

const App: React.FC = () => {
  //const { currentScreen, readerSettings } = useAppStore();
  const { currentScreen, readerSettings, setCurrentUser, setProStatus, navigate } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  const [loading, setLoading] = useState(false); // ✅ Start as false, not true

  // ✅ ADD THIS FIRST - Payment callback check
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    const trxref = params.get('trxref');
    const paymentRef = reference || trxref;
    
    if (paymentRef && paymentRef.startsWith('LOGOS_')) {
      console.log('🔍 Payment callback detected:', paymentRef);
      
      // Verify payment
      fetch(`https://logos-daily-backend.onrender.com/api/payments/verify/${paymentRef}`)
        .then(r => r.json())
        .then(data => {
          console.log('Verification result:', data);
          if (data.success) {
            const userId = localStorage.getItem('pendingProUserId');
            if (userId) {
              localStorage.setItem(`isPro_${userId}`, 'true');
              localStorage.setItem('logos_daily_pro', 'true');
              localStorage.removeItem('pendingProUserId');
              localStorage.removeItem('pendingProPlan');
              setProStatus(true);
            }
            // Show success and redirect to home
            alert('✅ Payment successful! You are now a Pro member.');
          } else {
            alert('Payment verification failed. Please contact support.');
          }
          // Clear URL and go to home
          window.history.replaceState({}, '', '/');
          window.location.href = '/';
        })
        .catch(() => {
          alert('Could not verify payment. Please check your connection.');
          window.location.href = '/';
        });
    }
  }, []);

  useEffect(() => {
      NotificationService.init();
      //NotificationService.listenForTap((route) => {
        //navigate(route); // router navigation
      //});
    }, []);

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

  // Add URL detection in App.tsx:
  useEffect(() => {
    // Check if current URL is payment callback
    const path = window.location.pathname;
    if (path === '/payment-success' || window.location.search.includes('reference=') || window.location.search.includes('trxref=')) {
      useAppStore.getState().navigate('payment-success' as any);
    }
  }, []);

  // Payment callback handler - works on both web and mobile
  useEffect(() => {
    // Check URL params for payment callback (works on web)
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

  // Inside your component

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('Running on web, skipping Capacitor App listener');
      return;
    }

    // Check if App plugin is available
    if (!App || typeof App.addListener !== 'function') {
      console.error('App plugin not available. Make sure @capacitor/app is installed.');
      return;
    }

    const handleAppUrlOpen = async (data: { url: string }) => {
      console.log('Deep link opened:', data.url);

      try {
        const url = new URL(data.url);
        const reference = url.searchParams.get('reference');

        if (url.pathname.includes('/payment/callback') && reference) {
          console.log('Payment reference found:', reference);
          
          // Fix the URL - use backticks!
          const response = await fetch(`https://logos-daily-backend.onrender.com/api/payments/verify/${reference}`);
          const result = await response.json();

          if (result.success && result.verified) {
            // Update pro status
            updateProStatus(true, result.userId);
            navigate('/settings');
          }
        }
      } catch (error) {
        console.error('Error handling deep link:', error);
      }
    };

    // Add the listener
    console.log('Registering appUrlOpen listener');
    const listener = App.addListener('appUrlOpen', handleAppUrlOpen);

    // Clean up
    return () => {
      console.log('Cleaning up appUrlOpen listener');
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    };
  }, []);

  // App resume handler - checks Pro status when user returns to app
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
              useAppStore.getState().setProStatus(true);
              console.log('✅ Pro activated!');
            }
          })
          .catch(console.error);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
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

  // Props to pass to every screen
  const screenProps = {
    theme,
    onClose: () => navigate('home'),
    navigate, // if screens need to navigate
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