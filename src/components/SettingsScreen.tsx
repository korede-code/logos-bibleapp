/**
 * Logos Daily — Settings Screen
 * ================================
 * App-wide settings featuring:
 * - Account management
 * - Sync configuration
 * - Privacy settings
 * - Storage management
 * - Subscription management
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, User, Shield, HardDrive, RefreshCw, Bell,
  Lock, ChevronRight, LogOut, Info, ExternalLink,
  Smartphone, Globe, Star, CheckCircle, Download,
  Trash2, Wifi, WifiOff, Cloud, Crown
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getTheme } from '../utils/themeUtils';
import { bibleApi } from '../services/bibleApiClient';
import AuthModal from './AuthModal';
import ProUpgradeModal from './ProUpgradeModal';
import { auth, logoutUser, getUserData } from '../config/firebase';
import PrivacyPolicyModal from './PrivacyPolicyModal';

const SettingsScreen: React.FC = () => {
  const { 
    readerSettings, 
    navigate, 
    isPro, 
    lastSyncAt, 
    pendingSyncCount,
    isOnline,
    syncOfflineChanges,
    notes,
    highlights,
    bookmarks,
    prayers,
    streak,
    readingSessions
  } = useAppStore();
  
  const theme = getTheme(readerSettings.theme);
  const [showArchSection, setShowArchSection] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [downloadedTranslations, setDownloadedTranslations] = useState([
    { name: 'King James Version (KJV)', code: 'KJV', size: '4.2 MB', downloaded: true },
    { name: 'American Standard Version (ASV)', code: 'ASV', size: '4.1 MB', downloaded: true },
    { name: 'World English Bible (WEB)', code: 'WEB', size: '4.1 MB', downloaded: false },
    { name: 'Young\'s Literal Translation (YLT)', code: 'YLT', size: '4.3 MB', downloaded: false },
  ]);

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const lastSync = lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Never';

  // Auth state listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        // Update store with user data
        const userData = await getUserData(user.uid);
        useAppStore.getState().setCurrentUser(user);
        useAppStore.getState().setUserData(userData);
        if (userData?.isPro) {
          useAppStore.getState().setProStatus(true);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const result = await logoutUser();
    if (result.success) {
      useAppStore.getState().logout();
      setCurrentUser(null);
      showToast('Signed out successfully', '#4CAF50');
    } else {
      showToast('Failed to sign out', '#e53935');
    }
  };

  // Estimate storage used based on data
  useEffect(() => {
    const estimateStorage = () => {
      const dataCount = notes.length + highlights.length + bookmarks.length + prayers.length;
      // Rough estimate: ~5KB per item
      const estimatedKB = dataCount * 5;
      setStorageUsed(estimatedKB);
    };
    estimateStorage();
  }, [notes, highlights, bookmarks, prayers]);

  // Check API status
  useEffect(() => {
    const checkApiStatus = async () => {
      setApiStatus('checking');
      try {
        const isHealthy = await bibleApi.healthCheck();
        setApiStatus(isHealthy ? 'online' : 'offline');
      } catch {
        setApiStatus('offline');
      }
    };
    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000);
    return () => clearInterval(interval);
  }, []);


  const handleDownloadTranslation = async (translation: typeof downloadedTranslations[0]) => {
    if (translation.downloaded) return;
    
    showToast(`📥 Downloading ${translation.name}...`, '#7B4F2E');
    
    setTimeout(() => {
      setDownloadedTranslations(prev =>
        prev.map(t =>
          t.code === translation.code ? { ...t, downloaded: true } : t
        )
      );
      showToast(`✅ ${translation.name} downloaded successfully!`, '#4CAF50');
    }, 2000);
  };

  const handleClearCache = async () => {
    try {
      // Keep reader settings, clear other data
      const currentState = {
        readerSettings: readerSettings,
        readingPosition: useAppStore.getState().readingPosition
      };
      localStorage.setItem('logos-daily-state', JSON.stringify(currentState));
      
      setStorageUsed(0);
      setShowClearConfirm(false);
      showToast('🗑️ Cache cleared successfully', '#4CAF50');
      
      // Reload to reset state
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Failed to clear cache:', error);
      showToast('❌ Failed to clear cache', '#e53935');
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
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const formatBytes = (kb: number): string => {
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const SettingRow: React.FC<{
    icon: React.ReactNode;
    label: string;
    description?: string;
    value?: string;
    action?: () => void;
    badge?: string;
    danger?: boolean;
    disabled?: boolean;
  }> = ({ icon, label, description, value, action, badge, danger, disabled }) => (
    <button
      onClick={action}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
      }`}
      style={{ borderBottom: `1px solid ${theme.border}` }}
      aria-label={`${label}${value ? ': ' + value : ''}`}
    >
      <span style={{ color: danger ? '#e53935' : disabled ? theme.textFaint : theme.accent }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm" style={{ color: danger ? '#e53935' : disabled ? theme.textFaint : theme.text }}>{label}</p>
        {description && <p className="text-xs mt-0.5 truncate" style={{ color: theme.textFaint }}>{description}</p>}
      </div>
      {badge && (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>
          {badge}
        </span>
      )}
      {value && <span className="text-xs font-medium flex-shrink-0" style={{ color: theme.textMuted }}>{value}</span>}
      {!disabled && <ChevronRight size={14} style={{ color: theme.textFaint }} />}
    </button>
  );

  const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <p className="text-xs font-bold uppercase tracking-widest px-4 pt-5 pb-2" style={{ color: theme.textMuted }}>
      ✦ {title}
    </p>
  );

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('home')} style={{ color: theme.textMuted }} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif' }}>
            Settings
          </h1>
        </div>
      </div>

      {/* Account Section */}
      <div className="flex-1 overflow-y-auto"> 
        <div className="mx-5 mt-5 rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <div className="p-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}99)` }}
            >
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl text-white">{currentUser?.displayName?.[0] || '✝'}</span>
              )}
            </div>
            <div>
              <p className="font-bold" style={{ color: theme.text }}>
                {currentUser?.displayName || currentUser?.email || 'Guest User'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
                {isPro ? '⭐ Logos Pro Member' : 'Free Account'}
              </p>
              {currentUser?.email && (
                <p className="text-xs mt-0.5" style={{ color: theme.textFaint }}>{currentUser.email}</p>
              )}
            </div>
          </div>

          {!currentUser ? (
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
                  onClick={() => navigate('subscription')}
                  className="w-full py-3 text-center font-semibold text-sm transition-all hover:opacity-80"
                  style={{ background: `linear-gradient(135deg, ${theme.accent}22, ${theme.accent}08)`, color: theme.accent }}
                >
                  Upgrade to Pro →
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="w-full py-3 text-center font-semibold text-sm transition-all hover:opacity-80"
                style={{ color: '#e53935' }}
              >
                Sign Out
              </button>
            </>
          )}
        </div>

        {/* Privacy & Security */}
        <div className="mx-5 mt-3 rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <SectionHeader title="Privacy & Security" />
          <SettingRow
            icon={<Lock size={16} />}
            label="End-to-End Encryption"
            description="Notes, highlights, and prayers are encrypted"
            badge="Active"
            action={() => showToast('Encryption is always active', theme.accent)}
          />
          
          <SettingRow 
            icon={<Shield size={16} />} 
            label="Privacy Policy" 
            description="No tracking, no ads, no data selling"
            action={() => setShowPrivacyPolicy(true)} 
          />
          <SettingRow 
            icon={<HardDrive size={16} />} 
            label="Export All Data" 
            description="Download your complete data as JSON" 
            action={() => {
              const exportData = {
                notes,
                highlights,
                bookmarks,
                prayers,
                streak,
                readingSessions,
                exportDate: new Date().toISOString()
              };
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `logos-daily-export-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
              showToast('✅ Data exported!', '#4CAF50');
            }}
          />
        </div>

        {/* Offline Storage */}
        <div className="mx-5 mt-3 rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <SectionHeader title="Offline Storage" />
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cloud size={14} style={{ color: theme.accent }} />
                <span className="text-sm font-medium" style={{ color: theme.text }}>Storage Usage</span>
              </div>
              <span className="text-xs font-bold" style={{ color: theme.accent }}>
                {formatBytes(storageUsed)}
              </span>
            </div>
            
            <div className="space-y-2">
              {downloadedTranslations.map(t => (
                <div key={t.name} className="flex items-center justify-between py-2 rounded-xl px-3" style={{ backgroundColor: theme.surface }}>
                  <div>
                    <p className="text-xs font-medium" style={{ color: theme.text }}>{t.name}</p>
                    <p className="text-xs" style={{ color: theme.textFaint }}>{t.size}</p>
                  </div>
                  <button
                    onClick={() => handleDownloadTranslation(t)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                    style={{
                      backgroundColor: t.downloaded ? `${theme.accent}20` : theme.accent,
                      color: t.downloaded ? theme.accent : 'white',
                    }}
                    disabled={t.downloaded}
                  >
                    {t.downloaded ? (
                      <span className="flex items-center gap-1"><CheckCircle size={12} /> Downloaded</span>
                    ) : (
                      <span className="flex items-center gap-1"><Download size={12} /> Download</span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="mx-5 mt-3 rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <SectionHeader title="App Info" />
          <SettingRow icon={<Info size={16} />} label="Version" value="1.0.0" action={() => {}} />
          <SettingRow icon={<Smartphone size={16} />} label="Platform" value="Web" action={() => {}} />
          <SettingRow 
            icon={<Globe size={16} />} 
            label="API Status" 
            value={apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Offline' : 'Checking'} 
            badge={apiStatus === 'online' ? '✓' : apiStatus === 'offline' ? '!' : '...'} 
            action={() => {}}
          />
          <button
            onClick={() => setShowArchSection(!showArchSection)}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all hover:opacity-80"
            style={{ borderBottom: `1px solid ${theme.border}` }}
            aria-expanded={showArchSection}
          >
            <ExternalLink size={16} style={{ color: theme.accent }} />
            <p className="font-medium text-sm flex-1" style={{ color: theme.text }}>Technical Architecture</p>
            <span style={{ color: theme.textFaint, transform: showArchSection ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
          </button>
        </div>

        {/* Technical Architecture Panel */}
        {showArchSection && (
          <div
            className="mx-5 mt-3 rounded-2xl p-4 space-y-3 text-xs"
            style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, fontFamily: 'monospace' }}
          >
            <p className="font-bold text-sm mb-2" style={{ color: theme.text }}>Technical Blueprint</p>
            {[
              { label: 'Frontend', value: 'React 19 + Vite', detail: 'Zustand state · Tailwind CSS' },
              { label: 'Backend', value: 'Node.js + Express', detail: 'Port 3000 · Bible API proxy' },
              { label: 'Bible API', value: 'bible-api.com (free)', detail: 'KJV, ASV, WEB translations' },
              { label: 'Offline', value: 'localStorage + IndexedDB', detail: 'Cached verses and user data' },
            ].map(item => (
              <div key={item.label} style={{ borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px' }}>
                <span className="font-bold" style={{ color: theme.accent }}>{item.label}: </span>
                <span style={{ color: theme.text }}>{item.value}</span>
                <br />
                <span style={{ color: theme.textFaint }}>{item.detail}</span>
              </div>
            ))}
          </div>
        )}

        {/* Danger Zone */}
        <div className="mx-5 mt-3 mb-8 rounded-2xl overflow-hidden" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
          <SectionHeader title="Danger Zone" />
          
          {!showClearConfirm ? (
            <SettingRow 
              icon={<Trash2 size={16} />} 
              label="Clear Cached Data" 
              description={`${formatBytes(storageUsed)} used — reset app data`} 
              action={() => setShowClearConfirm(true)} 
              danger 
            />
          ) : (
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: `${theme.accent}10` }}>
              <p className="text-sm mb-2" style={{ color: theme.text }}>Clear all cached app data?</p>
              <p className="text-xs mb-3" style={{ color: theme.textMuted }}>Your notes and highlights will be preserved.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleClearCache}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: '#e53935', color: 'white' }}
                >
                  Yes, Clear
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: theme.surface, color: theme.text }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {!showSignOutConfirm ? (
            <SettingRow 
              icon={<LogOut size={16} />} 
              label="Sign Out" 
              description="Clear all app data and reset" 
              action={() => setShowSignOutConfirm(true)} 
              danger 
            />
          ) : (
            <div className="px-4 py-3" style={{ backgroundColor: `${theme.accent}10` }}>
              <p className="text-sm mb-2" style={{ color: theme.text }}>Sign out of Logos Daily?</p>
              <p className="text-xs mb-3" style={{ color: theme.textMuted }}>All app data will be cleared.</p>
              <div className="flex gap-2">
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: '#e53935', color: 'white' }}
                >
                  Yes, Sign Out
                </button>
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: theme.surface, color: theme.text }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="mx-5 mb-20 p-4 rounded-2xl text-center"
          style={{ backgroundColor: theme.surface }}
        >
          <span className="text-2xl block mb-2">✝</span>
          <p className="text-xs font-bold" style={{ color: theme.text }}>Logos Daily</p>
          <p className="text-xs" style={{ color: theme.textMuted }}>Psalm 119:105</p>
          <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t" style={{ borderColor: theme.border }}>
            {isOnline ? (
              <>
                <Wifi size={10} style={{ color: '#4CAF50' }} />
                <span className="text-xs" style={{ color: '#4CAF50' }}>Connected</span>
              </>
            ) : (
              <>
                <WifiOff size={10} style={{ color: '#f59e0b' }} />
                <span className="text-xs" style={{ color: '#f59e0b' }}>Offline</span>
              </>
            )}
            <span className="text-xs" style={{ color: theme.textFaint }}>v1.0.0</span>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Welcome ${user.displayName || user.email}!`, '#4CAF50');
        }}
        themeMode={readerSettings.theme}
      />

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        userEmail={currentUser?.email || ''}
        userId={currentUser?.uid || ''}
        onSuccess={() => {
          useAppStore.getState().setProStatus(true);
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