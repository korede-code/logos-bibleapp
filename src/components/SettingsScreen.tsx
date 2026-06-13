// src/components/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Shield, Lock, LogOut, Crown, ChevronRight
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getTheme } from '../utils/themeUtils';
import { logoutUser, getUserData, auth, updateUserProStatus, saveUserToFirestore } from '../config/firebase';
import AuthModal from './AuthModal';
import ProUpgradeModal from './ProUpgradeModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';

const SettingsScreen: React.FC = () => {
  const { 
    readerSettings, 
    navigate, 
    setCurrentUser,
    isPro: storeIsPro,
    setProStatus: updateStoreProStatus 
  } = useAppStore();
  
  const theme = getTheme(readerSettings.theme);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  const updateProStatus = (status: boolean, uid?: string) => {
    updateStoreProStatus(status);  // ✅ Use store function
    setIsPro(status);
    const userId = uid ?? user?.uid;
    if (userId) {
      localStorage.setItem(`isPro_${userId}`, JSON.stringify(status));
    }
    localStorage.setItem('logos_daily_pro', JSON.stringify(status));
  };



  const refreshProStatus = async () => {
    if (!user?.uid) return;

    try {
      const response = await fetch(
        `https://logos-daily-backend.onrender.com/api/payments/pro-status/${user.uid}`
      );
      const data = await response.json();
      
      if (data.success && data.isPro) {
        updateStoreProStatus(true);
        localStorage.setItem(`isPro_${user.uid}`, JSON.stringify(true));
        localStorage.setItem('logos_daily_pro', JSON.stringify(true));
        showToast('✅ Pro status confirmed!', '#4CAF50');
      }
    } catch (e) {
      console.error('Failed to check Pro status:', e);
    }
  };

  // Listen to auth state changes
  // src/components/SettingsScreen.tsx - Update the auth listener

  // In SettingsScreen.tsx, update the auth useEffect

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Save user to localStorage
        localStorage.setItem('logos_user', JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        }));
        
        // Check localStorage first
        const savedPro = localStorage.getItem(`isPro_${firebaseUser.uid}`) === 'true';
        if (savedPro) {
          setIsPro(true);
          updateProStatus(true, firebaseUser.uid);
        }
        
        // Force refresh token to get latest claims
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult(true);
          if (idTokenResult.claims.isPro) {
            updateProStatus(true, firebaseUser.uid);
          }
        } catch (e) {
          console.error('Token refresh error:', e);
        }
        
        // Check Firestore
        try {
          const userData = await getUserData(firebaseUser.uid);
          if (userData?.isPro) {
            updateProStatus(true, firebaseUser.uid);
          }
        } catch (e) {
          console.error('Firestore check error:', e);
        }
      }
      
      // ✅ FIX: Set loading to false after auth check completes
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Force check pro status on mount and when user changes
  useEffect(() => {
    const checkProStatus = () => {
      if (user?.uid) {
        const savedPro = localStorage.getItem(`isPro_${user.uid}`) === 'true';
        console.log(`🔍 Checking pro status for ${user.uid}: ${savedPro ? 'PRO' : 'FREE'}`);
        setIsPro(savedPro);
        updateProStatus(savedPro);
      }
    };
    checkProStatus();
  }, [user]);

  // Add this useEffect to prevent infinite loading
  useEffect(() => {
    // Safety timeout: if auth doesn't resolve in 5 seconds, show the screen anyway
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, []);

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

  const showToast = (message: string, bgColor: string) => {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: ${bgColor}; color: white; padding: 10px 20px;
      border-radius: 10px; z-index: 1000; font-size: 14px;
      animation: fadeInUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" style={{ backgroundColor: theme.bg }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.accent }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('home')} style={{ color: theme.textMuted }}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: theme.text }}>Settings</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Account Section */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="p-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}99)` }}
            >
              <span className="text-2xl text-white">
                {user?.displayName?.[0] || user?.email?.[0] || 'G'}
              </span>
            </div>
            <div>
              <p className="font-bold" style={{ color: theme.text }}>
                {user?.displayName || user?.email || 'Guest User'}
              </p>
              {isPro && user && (
                <div className="flex items-center gap-1 mt-1">
                  <Crown size={12} style={{ color: theme.accent }} />
                  <span className="text-xs font-semibold" style={{ color: theme.accent }}>⭐ Pro Member</span>
                </div>
              )}
              {!isPro && user && (
                <p className="text-xs mt-1" style={{ color: theme.textMuted }}>Free Account</p>
              )}
              {user?.email && (
                <p className="text-xs mt-0.5" style={{ color: theme.textFaint }}>{user.email}</p>
              )}
            </div>
          </div>

          {!user ? (
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full py-3 text-center font-semibold text-sm transition-all hover:opacity-80"
              style={{ backgroundColor: theme.accent, color: 'white' }}
            >
              Sign In / Create Account
            </button>
          ) : (
            <>
              {!isPro && (
                <button
                  onClick={() => setShowProModal(true)}
                  className="w-full py-3 text-center font-semibold text-sm transition-all hover:opacity-80"
                  style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
                >
                  Upgrade to Pro →
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="w-full py-3 text-center font-semibold text-sm transition-all hover:opacity-80 flex items-center justify-center gap-2"
                style={{ color: '#e53935' }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </>
          )}
          
        </div>
        {user && process.env.NODE_ENV !== 'production' && (
            <button
              onClick={async () => {
                await updateUserProStatus(user.uid, true);
                setIsPro(true);
                setProStatus(true);
                showToast('Pro status updated (test)', '#4CAF50');
              }}
              className="w-full py-2 text-center text-xs mb-2 rounded"
              style={{ backgroundColor: theme.surface, color: theme.accent }}
            >
              [Test] Set Pro Status in Firestore
            </button>
          )}

        {/* Privacy & Security */}
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <p className="text-xs font-bold uppercase tracking-widest px-4 pt-5 pb-2" style={{ color: theme.textMuted }}>
            ✦ Privacy & Security
          </p>
          
          <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <Lock size={16} style={{ color: theme.accent }} />
            <div className="flex-1">
              <p className="font-medium text-sm" style={{ color: theme.text }}>End-to-End Encryption</p>
              <p className="text-xs" style={{ color: theme.textFaint }}>Notes, highlights, and prayers are encrypted</p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>Active</span>
          </div>

          <button
            onClick={() => setShowPrivacyPolicy(true)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all hover:opacity-80"
            style={{ borderBottom: `1px solid ${theme.border}` }}
          >
            <Shield size={16} style={{ color: theme.accent }} />
            <div className="flex-1">
              <p className="font-medium text-sm" style={{ color: theme.text }}>Privacy Policy</p>
              <p className="text-xs" style={{ color: theme.textFaint }}>No tracking, no ads, no data selling</p>
            </div>
            <ChevronRight size={14} style={{ color: theme.textFaint }} />
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 rounded-2xl text-center" style={{ backgroundColor: theme.surface }}>
          <span className="text-2xl block mb-2">✝</span>
          <p className="text-xs font-bold" style={{ color: theme.text }}>Logos Daily</p>
          <p className="text-xs" style={{ color: theme.textMuted }}>Psalm 119:105</p>
          <p className="text-xs mt-2" style={{ color: theme.textFaint }}>v1.0.0</p>
        </div>
      </div>

      {/* Modals */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={(loggedInUser) => {
          console.log('SettingsScreen: User signed in', loggedInUser);
          setUser(loggedInUser);
          setCurrentUser(loggedInUser);
          // Check for existing pro status after sign in
          const savedPro = localStorage.getItem(`isPro_${loggedInUser.uid}`) === 'true';
          setIsPro(savedPro);
          setProStatus(savedPro);
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
          console.log('SettingsScreen: Pro upgrade successful - updating status');
          setIsPro(true);
          setProStatus(true);
          if (user?.uid) {
            localStorage.setItem(`isPro_${user.uid}`, 'true');
          }
          showToast('🎉 Welcome to Logos Pro!', theme.accent);
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