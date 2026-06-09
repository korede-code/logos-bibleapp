// src/components/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Shield, Lock, LogOut, Crown, ChevronRight
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getTheme } from '../utils/themeUtils';
import { logoutUser, getUserData, auth, updateUserProStatus } from '../config/firebase';
import AuthModal from './AuthModal';
import ProUpgradeModal from './ProUpgradeModal';
import PrivacyPolicyModal from './PrivacyPolicyModal';

const SettingsScreen: React.FC = () => {
  const { readerSettings, navigate, setCurrentUser, setProStatus, isPro: storeIsPro } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  // Listen to auth state changes
  // src/components/SettingsScreen.tsx - Update the auth listener

  useEffect(() => {
    console.log('SettingsScreen: Setting up auth listener');
    
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      console.log('SettingsScreen: Auth changed', authUser?.email);
      setUser(authUser);
      
      if (authUser) {
        // Save user to store
        setCurrentUser(authUser);
        
        // Get user data from Firestore (includes pro status)
        try {
          // First, ensure user document exists
          const userData = await getUserData(authUser.uid);
          
          if (userData) {
            console.log('📦 Firestore user data:', userData);
            const isProUser = userData.isPro === true;
            console.log(`🌟 Pro status from Firestore: ${isProUser ? 'PRO' : 'FREE'}`);
            setIsPro(isProUser);
            setProStatus(isProUser);
            
            // Also save to localStorage as backup
            localStorage.setItem(`isPro_${authUser.uid}`, isProUser ? 'true' : 'false');
          } else {
            // Create user document if it doesn't exist
            console.log('📝 Creating new user document in Firestore...');
            await saveUserToFirestore(authUser);
            setIsPro(false);
            setProStatus(false);
          }
        } catch (error) {
          console.error('Failed to fetch user data:', error);
          // Fallback to localStorage
          const storedPro = localStorage.getItem(`isPro_${authUser.uid}`) === 'true';
          setIsPro(storedPro);
          setProStatus(storedPro);
        }
        
        // Save user to localStorage for quick access
        localStorage.setItem('logos_user', JSON.stringify({
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          photoURL: authUser.photoURL,
        }));
      } else {
        // User signed out
        setCurrentUser(null);
        setProStatus(false);
        setIsPro(false);
        localStorage.removeItem('logos_user');
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [setCurrentUser, setProStatus]);

  // Force check pro status on mount and when user changes
  useEffect(() => {
    const checkProStatus = () => {
      if (user?.uid) {
        const savedPro = localStorage.getItem(`isPro_${user.uid}`) === 'true';
        console.log(`🔍 Checking pro status for ${user.uid}: ${savedPro ? 'PRO' : 'FREE'}`);
        setIsPro(savedPro);
        setProStatus(savedPro);
      }
    };
    checkProStatus();
  }, [user, setProStatus]);

  const handleSignOut = async () => {
    const result = await logoutUser();
    if (result.success) {
      setUser(null);
      setIsPro(false);
      setProStatus(false);
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