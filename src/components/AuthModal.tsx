// src/components/AuthModal.tsx

import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Eye, EyeOff, CheckCircle, Globe, User } from 'lucide-react';
import { auth } from '../config/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';

import { useAppStore } from '../store/appStore';
import { getTheme } from '../utils/themeUtils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: any) => void;
  themeMode?: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, themeMode = 'dark' }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const { setCurrentUser, setUserData } = useAppStore();
  const theme = getTheme(themeMode as any);

  // Handle redirect result (for mobile)
  useEffect(() => {
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        handleAuthSuccess(result.user);
        if (onSuccess) onSuccess(result.user);
      }
    }).catch((error) => {
      console.error('Redirect sign-in error:', error);
      //setError(error.message);
    });
  }, []);

  if (!isOpen) return null;

  const handleAuthSuccess = (user: any) => {
    if (!user) return;
    const userData = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
    };
    localStorage.setItem('logos_user', JSON.stringify(userData));
    console.log('Auth success', userData);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // Check if running on native device
      const isNative = (window as any).Capacitor?.isNativePlatform();
      
      if (isNative) {
        // On mobile, use redirect (popup doesn't work in WebView)
        await signInWithRedirect(auth, provider);
        // The result will be handled by the redirect listener below
      } else {
        // On web, use popup
        const result = await signInWithPopup(auth, provider);
        handleAuthSuccess(result.user);
        if (onSuccess) onSuccess(result.user);
        onClose();
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let result;
      
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
        result = { success: true, user: userCredential.user };
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        result = { success: true, user: userCredential.user };
      }
      
      if (result.success && result.user) {
        handleAuthSuccess(result.user);
        if (onSuccess) onSuccess(result.user);
        showToast(mode === 'signup' ? `Welcome ${displayName || email}!` : 'Welcome back!', '#4CAF50');
        onClose();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.border }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: theme.text }}>
              {mode === 'signin' && 'Welcome Back'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
              {mode === 'signin' && 'Sign in to continue your Bible study'}
              {mode === 'signup' && 'Start your journey with Logos Daily'}
              {mode === 'forgot' && 'Enter your email to reset password'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:opacity-80 transition-all"
            style={{ color: theme.textMuted }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#e5393520', color: '#e53935' }}>
              {error}
            </div>
          )}
          
          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2" style={{ backgroundColor: '#4CAF5020', color: '#4CAF50' }}>
              <CheckCircle size={16} />
              {successMessage}
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.textMuted }}>
                  Display Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textFaint }} />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl outline-none text-sm transition-all"
                    style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
                    placeholder="John Doe"
                    required={mode === 'signup'}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: theme.textMuted }}>
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textFaint }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl outline-none text-sm transition-all"
                  style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.textMuted }}>
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textFaint }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl outline-none text-sm transition-all"
                    style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
                    placeholder="••••••••"
                    required={mode !== 'forgot'}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff size={16} style={{ color: theme.textFaint }} /> : <Eye size={16} style={{ color: theme.textFaint }} />}
                  </button>
                </div>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs mt-1 hover:underline"
                    style={{ color: theme.accent }}
                  >
                    Forgot password?
                  </button>
                )}
                {mode === 'signup' && (
                  <p className="text-xs mt-1" style={{ color: theme.textFaint }}>
                    Password must be at least 6 characters
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: theme.accent, color: 'white' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Please wait...
                </span>
              ) : (
                mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Email'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: theme.border }}></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2" style={{ backgroundColor: theme.card, color: theme.textMuted }}>
                or continue with
              </span>
            </div>
          </div>

          {/* Google Sign In */}
          {!(window as any).Capacitor?.isNativePlatform() && (
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
            >
              <Globe size={20} />
              Google
            </button>
          )}

          {/* Footer Links */}
          <div className="mt-5 text-center">
            {mode === 'signin' && (
              <p className="text-xs" style={{ color: theme.textMuted }}>
                Don't have an account?{' '}
                <button onClick={() => { setMode('signup'); setError(''); }} className="font-semibold hover:underline" style={{ color: theme.accent }}>
                  Sign up for free
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p className="text-xs" style={{ color: theme.textMuted }}>
                Already have an account?{' '}
                <button onClick={() => { setMode('signin'); setError(''); }} className="font-semibold hover:underline" style={{ color: theme.accent }}>
                  Sign in
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <button onClick={() => { setMode('signin'); setError(''); }} className="text-xs hover:underline" style={{ color: theme.accent }}>
                Back to Sign In
              </button>
            )}
          </div>

          {/* Benefits for new users */}
          {mode === 'signup' && (
            <div className="mt-4 pt-3 border-t" style={{ borderColor: theme.border }}>
              <p className="text-xs font-medium mb-2" style={{ color: theme.textMuted }}>By signing up, you get:</p>
              <div className="space-y-1.5">
                {[
                  '📖 Sync your reading across all devices',
                  '✏️ Never lose your notes and highlights',
                  '🙏 Save your prayer journal in the cloud',
                  '⭐ Unlock exclusive features'
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle size={10} style={{ color: '#4CAF50' }} />
                    <span className="text-xs" style={{ color: theme.textFaint }}>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


function handleAuthSuccess(user: any) {
  if (!user) return;

  const userData = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
  };

  localStorage.setItem('logos_user', JSON.stringify(userData));
  console.log('Google sign-in success', userData);
}

async function signInWithEmail(email: string, password: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return {
      success: true,
      user: result.user,
      error: '',
    };
  } catch (err: any) {
    console.error('Email sign-in error:', err);
    return {
      success: false,
      user: null,
      error: err?.message || 'Failed to sign in with email',
    };
  }
}

// At the bottom of AuthModal.tsx, OUTSIDE the component:

  async function signUpWithEmail(email: string, password: string, displayName: string) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // If a displayName was provided, update the new user's profile
      if (displayName && result.user) {
        try {
          await updateProfile(result.user, { displayName });
        } catch (profileErr) {
          console.warn('Failed to set displayName:', profileErr);
        }
      }
      return { success: true, user: result.user, error: '' };
    } catch (err: any) {
      return { success: false, user: null, error: err?.message || 'Failed to create account' };
    }
  }

export default AuthModal;
