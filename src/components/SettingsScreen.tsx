// src/components/SettingsScreen.tsx
import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { 
  ArrowLeft, Shield, Lock, LogOut, Crown, ChevronRight,
  BookOpen, Bell, Moon, Sun, Type, Check, AlertCircle
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getTheme } from '../utils/themeUtils';
import { logoutUser, auth } from '../config/firebase';
import AuthModal from './AuthModal';
import ProUpgradeModal from './ProUpgradeModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import { ReminderToggle } from './ReminderToggle';

// Lazy load heavy components
const ReaderSettingsPanel = lazy(() => import('./ReaderSettingsPanel'));

// Fallback theme
const defaultTheme = {
  bg: '#1a1a1a',
  card: '#2a2a2a',
  surface: '#333333',
  text: '#ffffff',
  textMuted: '#aaaaaa',
  textFaint: '#777777',
  accent: '#488AFF',
  border: '#444444',
  warning: '#f59e0b'
};

interface SettingsScreenProps {
  theme?: any;
  onClose?: (screen: string) => void;
  navigate?: (screen: string) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ theme, onClose, navigate: propNavigate }) => {
  const t = theme || defaultTheme;
  
  const { 
    readerSettings, 
    setCurrentUser,
    isPro: storeIsPro,
    setProStatus: updateStoreProStatus,
    updateReaderSettings
  } = useAppStore();

  const navigate = propNavigate || useAppStore.getState().navigate;
  
  // State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showReaderSettings, setShowReaderSettings] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  // Toast notification
  const showToast = useCallback((message: string, bgColor: string) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: ${bgColor}; color: white; padding: 10px 20px;
      border-radius: 10px; z-index: 1000; font-size: 14px;
      max-width: 90%;
      animation: fadeInUp 0.3s ease;
      z-index: 9999;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }, []);

  // Update Pro status
  const updateProStatus = useCallback((status: boolean, uid?: string) => {
    updateStoreProStatus(status);
    setIsPro(status);
    const userId = uid ?? user?.uid;
    if (userId) {
      localStorage.setItem(`isPro_${userId}`, JSON.stringify(status));
    }
    localStorage.setItem('logos_daily_pro', JSON.stringify(status));
  }, [user?.uid, updateStoreProStatus]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        localStorage.setItem('logos_user', JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        }));
        
        const savedPro = localStorage.getItem(`isPro_${firebaseUser.uid}`) === 'true';
        if (savedPro) {
          setIsPro(true);
          updateProStatus(true, firebaseUser.uid);
        }
        
        try {
          const response = await fetch(
            `https://logos-daily-backend.onrender.com/api/payments/pro-status/${firebaseUser.uid}`
          );
          const data = await response.json();
          if (data.isPro) {
            updateProStatus(true, firebaseUser.uid);
            setIsPro(true);
          }
        } catch (e) {
          console.error('Backend check error:', e);
        }
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [updateProStatus]);

  // App resume handler
  useEffect(() => {
    const handleResume = async () => {
      const pendingUserId = localStorage.getItem('pendingProUserId');
      if (pendingUserId) {
        try {
          const response = await fetch(
            `https://logos-daily-backend.onrender.com/api/payments/pro-status/${pendingUserId}`
          );
          const data = await response.json();
        
          if (data.isPro) {
            localStorage.setItem(`isPro_${pendingUserId}`, 'true');
            localStorage.setItem('logos_daily_pro', 'true');
            localStorage.removeItem('pendingProUserId');
            localStorage.removeItem('pendingProPlan');
            updateProStatus(true, pendingUserId);
            showToast('🎉 Pro upgrade confirmed!', '#4CAF50');
          }
        } catch (e) {
          console.error('Resume check error:', e);
        }
      }
    };

    document.addEventListener('resume', handleResume);
    window.addEventListener('focus', handleResume);
  
    return () => {
      document.removeEventListener('resume', handleResume);
      window.removeEventListener('focus', handleResume);
    };
  }, [updateProStatus, showToast]);

  const handleSignOut = async () => {
    const result = await logoutUser();
    if (result.success) {
      setUser(null);
      setIsPro(false);
      updateProStatus(false);
      setCurrentUser(null);
      localStorage.removeItem('logos_user');
      showToast('Signed out successfully', '#4CAF50');
    } else {
      showToast('Failed to sign out', '#e53935');
    }
  };

  // Translation change handler
  const handleTranslationChange = useCallback((translation: string) => {
    updateReaderSettings({ translation });
    showToast(`Switched to ${translation}`, '#4CAF50');
  }, [updateReaderSettings, showToast]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: t.bg }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: t.accent }} />
          <p className="mt-4 text-sm" style={{ color: t.textMuted }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: t.bg }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${t.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('home')} style={{ color: t.textMuted }} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: t.text }}>Settings</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* User Profile Section */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}>
          <div className="p-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${t.border}` }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${t.accent}, ${t.accent}99)` }}>
              <span className="text-2xl text-white">
                {user?.displayName?.[0] || user?.email?.[0] || 'G'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate" style={{ color: t.text }}>
                {user?.displayName || user?.email || 'Guest User'}
              </p>
              {isPro && (
                <div className="flex items-center gap-1 mt-1">
                  <Crown size={12} style={{ color: t.accent }} />
                  <span className="text-xs font-semibold" style={{ color: t.accent }}>⭐ Pro Member</span>
                </div>
              )}
              {!isPro && user && (
                <p className="text-xs mt-1" style={{ color: t.textMuted }}>Free Account</p>
              )}
            </div>
          </div>

          {!user ? (
            <button 
              onClick={() => setShowAuthModal(true)} 
              className="w-full py-3 text-center font-semibold text-sm transition-all hover:opacity-80"
              style={{ backgroundColor: t.accent, color: 'white' }}
            >
              Sign In / Create Account
            </button>
          ) : (
            <>
              {!isPro && (
                <button 
                  onClick={() => setShowProModal(true)} 
                  className="w-full py-3 text-center font-semibold text-sm transition-all hover:opacity-80"
                  style={{ backgroundColor: `${t.accent}20`, color: t.accent }}
                >
                  Upgrade to Pro →
                </button>
              )}
              <button 
                onClick={handleSignOut} 
                className="w-full py-3 text-center font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-80"
                style={{ color: '#e53935' }}
              >
                <LogOut size={16} /> Sign Out
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete your account? This will remove all your data permanently.')) {
                    handleSignOut();
                    localStorage.clear();
                    showToast('Account deletion requested. Your data will be removed within 7 days.', '#f59e0b');
                    setTimeout(() => window.location.href = '/', 2000);
                  }
                }}
                className="w-full py-3 text-center font-semibold text-sm mt-2 transition-all hover:opacity-80"
                style={{ backgroundColor: '#e5393520', color: '#e53935' }}
              >
                🗑️ Delete My Account & Data
              </button>
            </>
          )}
        </div>

        {/* 📖 Reader Settings */}
        <button
          onClick={() => setShowReaderSettings(true)}
          className="w-full rounded-2xl overflow-hidden mb-6 p-4 text-left transition-all hover:opacity-80"
          style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen size={16} style={{ color: t.accent }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: t.text }}>Reader Settings</p>
                <p className="text-xs" style={{ color: t.textMuted }}>Theme, font, translation & more</p>
              </div>
            </div>
            <ChevronRight size={16} style={{ color: t.textMuted }} />
          </div>
        </button>

        {/* Translation Quick Select */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}>
          <div className="px-4 py-3.5">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: t.textMuted }}>✦ Translation</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {['KJV', 'WEB', 'ASV', 'BBE', 'DARBY', 'YLT'].map(code => (
                <button
                  key={code}
                  onClick={() => handleTranslationChange(code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    readerSettings.translation === code
                      ? 'text-white'
                      : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: readerSettings.translation === code ? t.accent : t.surface,
                    color: readerSettings.translation === code ? 'white' : t.textMuted,
                    border: `1px solid ${readerSettings.translation === code ? t.accent : t.border}`,
                  }}
                >
                  {code}
                  {readerSettings.translation === code && <Check size={10} className="inline ml-1" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 🔔 Reminder Toggle */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}>
          <div className="px-4 py-3.5">
            <ReminderToggle theme={t} />
          </div>
        </div>

        {/* 🔒 Privacy & Security */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{ backgroundColor: t.card, border: `1px solid ${t.border}` }}>
          <p className="text-xs font-bold uppercase tracking-widest px-4 pt-5 pb-2" style={{ color: t.textMuted }}>✦ Privacy & Security</p>
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: `1px solid ${t.border}` }}>
            <Lock size={16} style={{ color: t.accent }} />
            <div className="flex-1">
              <p className="font-medium text-sm" style={{ color: t.text }}>End-to-End Encryption</p>
              <p className="text-xs" style={{ color: t.textFaint }}>Notes, highlights, and prayers are encrypted</p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: `${t.accent}20`, color: t.accent }}>Active</span>
          </div>
          <button 
            onClick={() => setShowPrivacyPolicy(true)} 
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all hover:opacity-80"
          >
            <Shield size={16} style={{ color: t.accent }} />
            <div className="flex-1">
              <p className="font-medium text-sm" style={{ color: t.text }}>Privacy Policy</p>
              <p className="text-xs" style={{ color: t.textFaint }}>No tracking, no ads, no data selling</p>
            </div>
            <ChevronRight size={14} style={{ color: t.textFaint }} />
          </button>       
        </div>
        
        {/* Footer */}
        <div className="mt-4 p-4 rounded-2xl text-center" style={{ backgroundColor: t.surface }}>
          <span className="text-2xl block mb-2">✝</span>
          <p className="text-xs font-bold" style={{ color: t.text }}>Synthesis Bible</p>
          <p className="text-xs" style={{ color: t.textMuted }}>Psalm 119:105</p>
          <p className="text-xs mt-2" style={{ color: t.textFaint }}>v1.0.0</p>
        </div>
      </div>

      {/* Reader Settings Panel (Lazy Loaded) */}
      <Suspense fallback={null}>
        {showReaderSettings && (
          <ReaderSettingsPanel
            onClose={() => setShowReaderSettings(false)}
          />
        )}
      </Suspense>

      {/* Modals */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setCurrentUser(loggedInUser);
          const savedPro = localStorage.getItem(`isPro_${loggedInUser.uid}`) === 'true';
          setIsPro(savedPro);
          updateStoreProStatus(savedPro);
          showToast(`Welcome ${loggedInUser.displayName || loggedInUser.email}!`, '#4CAF50');
        }}
        themeMode={readerSettings.theme}
      />

      <ProUpgradeModal 
        isOpen={showProModal} 
        onClose={() => setShowProModal(false)}
        userEmail={user?.email || ''}
        userId={user?.uid || ''}
        onSuccess={() => {
          setIsPro(true);
          updateStoreProStatus(true);
          if (user?.uid) localStorage.setItem(`isPro_${user.uid}`, 'true');
          showToast('🎉 Welcome to Synthesis Pro!', t.accent);
        }}
        themeMode={readerSettings.theme}
      />

      <PrivacyPolicyModal 
        isOpen={showPrivacyPolicy} 
        onClose={() => setShowPrivacyPolicy(false)} 
        themeMode={readerSettings.theme} 
      />
    </div>
  );
};

export default SettingsScreen;