/**
 * Logos Daily — Root Application Component
 * ==========================================
 *
 * This is the production-quality web preview of the Logos Daily Bible App.
 * The complete mobile app would be built with React Native + Expo, but this
 * demonstrates the full UI, state management, and feature set.
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║                    LOGOS DAILY — ARCHITECTURE                        ║
 * ╠══════════════════════════════════════════════════════════════════════╣
 * ║ Frontend:    React Native (Expo) + Zustand + React Query             ║
 * ║ Web Companion: React (Vite) — this file                              ║
 * ║ Backend:     Node.js/Express + PostgreSQL + Redis                    ║
 * ║ Database:    SQLite (local) via expo-sqlite                          ║
 * ║              PostgreSQL (server) via Prisma ORM                      ║
 * ║ Sync:        CRDT (Yjs) + vector clocks + operational log            ║
 * ║ Encryption:  AES-256-GCM at rest, TLS 1.3 in transit                ║
 * ║ Bible APIs:  bible4u.net (KJV/ASV), holybible.dev (VOTD)            ║
 * ║              Licensed: api.esv.org, scripture.api.bible              ║
 * ║ Storage:     IndexedDB (web), SQLite (native)                        ║
 * ║ Auth:        Supabase Auth (optional — offline-first)                ║
 * ║ CI/CD:       GitHub Actions → EAS Build → App Store/Play Store       ║
 * ║ Hosting:     AWS CDK (Lambda + RDS + CloudFront)                     ║
 * ║ Monitoring:  Crashlytics (no user tracking)                          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * DATABASE SCHEMA (PostgreSQL/SQLite):
 * ─────────────────────────────────────
 * books(id, name, abbreviation, testament, category, chapters)
 * verses(id, book_id, chapter, verse, text, translation_id)
 *   INDEX: verses(book_id, chapter) for fast chapter loading
 *   INDEX: FTS(text) for full-text search (FTS5 SQLite / tsvector PG)
 * translations(id, name, abbreviation, language, is_public_domain, api_key_required)
 * highlights(id, user_id, verse_id, color, style, vector_clock, created_at, updated_at, deleted_at)
 * notes(id, user_id, verse_id, title, content_encrypted, tags, vector_clock, created_at, updated_at)
 * bookmarks(id, user_id, verse_id, label, created_at)
 * prayers(id, user_id, title, body_encrypted, status, tags, answered_at, created_at, updated_at)
 * reading_plans(id, name, description, duration_days, category, is_pro)
 * plan_schedule(id, plan_id, day_number, readings JSON)
 * user_plans(id, user_id, plan_id, start_date, current_day, completed_days JSON)
 * reading_sessions(id, user_id, date, duration_minutes, chapters_read, verses_read)
 * groups(id, name, description, is_private, join_code, created_by)
 * group_members(id, group_id, user_id, role, joined_at)
 * sync_log(id, user_id, entity_type, entity_id, operation, vector_clock, payload, synced_at)
 *
 * CRDT CONFLICT RESOLUTION:
 * ──────────────────────────
 * Each mutable entity has a `vector_clock` field.
 * On sync:
 *   1. Client sends all changes since last_sync_at with vector_clock
 *   2. Server compares vector_clocks using Last-Write-Wins (LWW)
 *   3. For concurrent edits, content CRDTs (Yjs) merge text operations
 *   4. For highlights/bookmarks: LWW with soft-delete tombstones
 *   5. Conflict log is maintained for audit/rollback
 *
 * API ENDPOINTS:
 * ───────────────
 * GET  /api/bible/:translation/:book/:chapter         → verse list
 * GET  /api/bible/search?q=&translation=&book=        → full-text search
 * GET  /api/votd                                      → verse of the day
 * GET  /api/translations                              → available translations
 * POST /api/sync                                      → batch sync (CRDT)
 * GET  /api/plans                                     → reading plans library
 * POST /api/groups/:id/activity                       → group feed
 * POST /api/admin/votd                                → admin: set daily verse
 *
 * OFFLINE-FIRST STRATEGY:
 * ────────────────────────
 * 1. On first launch: download KJV in background chunks (50 chapters/batch)
 * 2. All reads go to SQLite first, fall back to API on cache miss
 * 3. All writes go to SQLite immediately, queue to sync service
 * 4. Sync runs on app resume + every 15 min when connected
 * 5. Conflict resolver runs before each sync batch commit
 *
 * PERFORMANCE TARGETS:
 * ─────────────────────
 * - App open → last verse displayed: < 1.5s (SQLite read)
 * - Chapter navigation: < 100ms
 * - Full-text search: < 300ms (FTS5 index)
 * - Highlight save: immediate (optimistic UI)
 * - Background sync: non-blocking, status indicator only
 */

import React, { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { getTheme } from './utils/themeUtils';


// Screen Components
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
import SubscriptionScreen from './components/SubscriptionScreen';
import PaymentCallback from './components/PaymentCallback';
import { getUserData, handleRedirectResult } from './config/firebase';


// ─── Screen Router ────────────────────────────────────────────────────────────

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
  subscription: SubscriptionScreen,
  'payment-callback': PaymentCallback,
};


// ─── Mobile Frame ─────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const { setCurrentUser, setUserData } = useAppStore();
  const { currentScreen, readerSettings } = useAppStore();
  const theme = getTheme(readerSettings.theme);

  useEffect(() => {
    const handleRedirect = async () => {
      const result = await handleRedirectResult();
      if (result.success && result.user) {
        console.log('User signed in:', result.user.email);
        setCurrentUser(result.user);
        
        // Get user data from Firestore
        const userData = await getUserData(result.user.uid);
        if (userData) {
          setUserData(userData);
          if (userData.isPro) {
            useAppStore.getState().setProStatus(true);
          }
        }
      }
    };
    
    handleRedirect();
  }, [setCurrentUser, setUserData]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.style.setProperty('--theme-bg', theme.bg);
    document.documentElement.style.setProperty('--theme-text', theme.text);
    document.documentElement.style.setProperty('--theme-accent', theme.accent);
    document.body.style.backgroundColor = '#0a0a0a';
  }, [theme]);

  const ActiveScreen = SCREENS[currentScreen] ?? HomeScreen;

  // Determine if bottom nav should be hidden (in focus mode while reading)
  const hideNav = readerSettings.focusMode && currentScreen === 'reader';

  return (
    <div
      className="flex items-center justify-center min-h-screen w-full"
      style={{ backgroundColor: '#0F0F0F', fontFamily: 'Inter, sans-serif' }}
      role="application"
      aria-label="Logos Daily Bible App"
    >
      {/* Desktop wrapper label */}
      <div className="hidden lg:flex flex-col items-start justify-center mr-8 max-w-xs">
        <div className="text-white mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg, #7B4F2E, #A0522D)' }}>
              ✝
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Crimson Pro, serif' }}>Logos Daily</h1>
              <p className="text-xs text-gray-400">Bible Study App</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-400">
            {[
              '📖 Multiple Bible translations (KJV, NIV, ESV...)',
              '✨ Color-coded highlights & verse notes',
              '🔍 Full-text search across all Scripture',
              '📅 Curated & custom reading plans',
              '🙏 Private, encrypted prayer journal',
              '👥 Small group sharing & reactions',
              '📊 Reading progress dashboard',
              '🌙 6 themes including Pure Black (OLED)',
              '🔒 Offline-first, privacy-first',
            ].map((feature, i) => (
              <p key={i} className="flex items-start gap-2 text-xs">
                <span className="flex-shrink-0">{feature.split(' ')[0]}</span>
                <span>{feature.split(' ').slice(1).join(' ')}</span>
              </p>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 font-mono">
              React 19 · Zustand · Recharts<br />
              Node.js · PostgreSQL · SQLite<br />
              CRDT Sync · AES-256 Encryption<br />
              WCAG 2.1 AA Accessible
            </p>
          </div>
        </div>
      </div>

      {/* Mobile App Frame */}
      <div
        className="relative flex-shrink-0 overflow-hidden"
        style={{
          width: '390px',
          height: '844px',
          borderRadius: '44px',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 0 0 11px #1a1a1a, 0 0 0 13px rgba(255,255,255,0.05), 0 40px 80px rgba(0,0,0,0.8)',
          backgroundColor: theme.bg,
        }}
        role="region"
        aria-label="Mobile app preview"
      >
        {/* Status Bar */}
        <div
          className="flex items-center justify-between px-8 py-2 flex-shrink-0 relative z-50"
          style={{
            backgroundColor: theme.navBg,
            height: '44px',
          }}
          aria-hidden="true"
        >
          <span className="text-xs font-bold" style={{ color: theme.text }}>
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
          {/* Notch */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-28 h-7 rounded-b-2xl" style={{ backgroundColor: '#000' }} />
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold" style={{ color: theme.text }}>●●●</span>
            <span className="text-xs font-bold" style={{ color: theme.text }}>WiFi</span>
            <span className="text-xs font-bold" style={{ color: theme.text }}>100%</span>
          </div>
        </div>

        {/* Main Content Area */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            height: 'calc(844px - 44px)',
            backgroundColor: theme.bg,
          }}
        >
          {/* Screen Content */}
          <div
            className="flex-1 overflow-hidden relative"
            style={{
              paddingBottom: hideNav ? '0' : '80px',
            }}
          >
            <div
              key={currentScreen}
              className="h-full w-full"
              style={{
                animation: 'screenFade 0.2s ease-out',
              }}
            >
              <ActiveScreen />
            </div>
          </div>

          {/* Bottom Navigation */}
          {!hideNav && <BottomNav />}
        </div>
      </div>

      {/* Right info panel */}
      <div className="hidden xl:flex flex-col items-start justify-center ml-8 max-w-xs">
        <div className="text-gray-400 space-y-4">
          <div>
            <p className="text-white font-bold mb-2 text-sm">Architecture Highlights</p>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
                <p className="text-green-400">// Offline-First Strategy</p>
                <p>SQLite → API fallback</p>
                <p>Background sync queue</p>
                <p>CRDT conflict resolver</p>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
                <p className="text-blue-400">// State Management</p>
                <p>Zustand + localStorage</p>
                <p>Optimistic UI updates</p>
                <p>Vector clock sync</p>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
                <p className="text-purple-400">// Privacy-First</p>
                <p>AES-256-GCM encryption</p>
                <p>Zero user tracking</p>
                <p>No ads, no data sales</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-white font-bold mb-1 text-sm">Shippable To</p>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-1 rounded" style={{ backgroundColor: '#1a1a1a' }}>iOS App Store</span>
              <span className="px-2 py-1 rounded" style={{ backgroundColor: '#1a1a1a' }}>Google Play</span>
              <span className="px-2 py-1 rounded" style={{ backgroundColor: '#1a1a1a' }}>Web</span>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes screenFade {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 2px; }
        input[type=range] { -webkit-appearance: none; appearance: none; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: var(--theme-accent, #7B4F2E);
          cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
        /* Focus styles for accessibility */
        button:focus-visible, input:focus-visible, textarea:focus-visible, [tabindex]:focus-visible {
          outline: 2px solid var(--theme-accent, #7B4F2E);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default App;
