/**
 * Logos Daily — Global Application State
 * ========================================
 * Implements a Zustand-based store with persistence middleware.
 * In production, this maps to:
 *   - Local: IndexedDB (web) / SQLite (native) via a service layer
 *   - Remote: PostgreSQL via the Logos Daily API with CRDT-based sync
 *
 * CRDT Strategy: Last-Write-Wins with vector clocks for highlights/notes.
 * Each mutation generates a log entry that is replayed during conflict resolution.
 */

import { create } from 'zustand';
import { DAILY_VERSES } from '../data/bibleData';
import { bibleApi } from '../services/bibleApiClient';
// Removed unused import: User from 'firebase/auth'

// ─── Type Definitions ─────────────────────────────────────────────────────────

export type Theme = 'classic' | 'sepia' | 'dark' | 'pure-black' | 'nature' | 'ocean';
export type FontFamily = 'Crimson Pro' | 'EB Garamond' | 'Lora' | 'Merriweather' | 'Inter' | 'Playfair Display' | 'Source Serif 4' | 'Literata' | 'Spectral';
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'orange';
export type AppScreen = 'home' | 'reader' | 'search' | 'plans' | 'notes' | 'prayer' | 'progress' | 'settings' | 'groups' | 'bookmarks' | 'subscription';

export interface ReadingPosition {
  bookId: number;
  book: string;
  chapter: number;
  verse: number;
  timestamp: number;
  translation: string;
}

export interface Highlight {
  id: string;
  bookId: number;
  book: string;
  chapter: number;
  verse: number;
  color: HighlightColor;
  style: 'highlight' | 'underline';
  createdAt: number;
  updatedAt: number;
  vectorClock: number; // CRDT vector clock
}

export interface VerseNote {
  id: string;
  bookId: number;
  book: string;
  chapter: number;
  verse: number;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  vectorClock: number;
}

export interface Bookmark {
  id: string;
  bookId: number;
  book: string;
  chapter: number;
  verse: number;
  label: string;
  createdAt: number;
}

export interface PrayerEntry {
  id: string;
  title: string;
  body: string;
  status: 'praying' | 'answered' | 'archived';
  answeredAt?: number;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ActiveReadingPlan {
  planId: string;
  startDate: number;
  currentDay: number;
  completedDays: number[];
  lastReadAt: number;
}

export interface ReadingStreak {
  current: number;
  longest: number;
  lastReadDate: string; // YYYY-MM-DD
  totalDaysRead: number;
}

export interface ReadingSession {
  date: string;
  durationMinutes: number;
  chaptersRead: number;
  versesRead: number;
}

export interface ReaderSettings {
  theme: Theme;
  fontFamily: FontFamily;
  fontSize: number; // 14-32px
  lineSpacing: number; // 1.2-2.5
  marginWidth: number; // 0-64px
  focusMode: boolean;
  showVerseNumbers: boolean;
  showFootnotes: boolean;
  showCrossReferences: boolean;
  translation: string;
  parallelTranslation: string | null;
  viewMode: 'scroll' | 'paginated' | 'parallel' | 'verse-comparison';
  paragraphMode: boolean;
  redLetterText: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isPrivate: boolean;
  sharedPlanId?: string;
  joinCode: string;
  role: 'admin' | 'member';
}

export interface RealVerse {
  reference: string;
  text: string;
  translation: string;
  book: string;
  bookId?: number;
  chapter: number;
  verse: number;
}

export interface SearchResult {
  reference: string;
  text: string;
  translation: string;
  book: string;
  chapter: number;
  verse: number;
  relevance?: number;
}

export interface TranslationOption {
  code: string;
  name: string;
  requiresPro: boolean;
}

// CORS allowed origins for the backend
export const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://logos-daily.web.app',
  'https://logos-daily.firebaseapp.com',
  'https://logos-daily-backend.onrender.com',
  'https://app.logosdaily.com', // Custom domain
];

export interface AppState {
  // Navigation
  currentScreen: AppScreen;
  previousScreen: AppScreen | null;

  // Reading position
  readingPosition: ReadingPosition;

  // Reader settings
  readerSettings: ReaderSettings;

  // Annotations
  highlights: Highlight[];
  notes: VerseNote[];
  bookmarks: Bookmark[];

  // Prayer
  prayers: PrayerEntry[];

  // Reading plans
  activePlans: ActiveReadingPlan[];

  // Progress
  streak: ReadingStreak;
  readingSessions: ReadingSession[];

  // Groups
  groups: Group[];

  // Daily Verse
  dailyVerseIndex: number;

  // Search
  searchHistory: string[];
  lastSearchQuery: string;

  // Subscription & Auth
  isPro: boolean;
  currentUser: any | null;
  userData: any | null;

  // Sync
  lastSyncAt: number | null;
  pendingSyncCount: number;

  // UI State
  selectedVerses: string[]; // "bookId:chapter:verse"
  isAnnotationToolbarOpen: boolean;
  currentNote: Partial<VerseNote> | null;
  currentPrayer: Partial<PrayerEntry> | null;
  searchQuery: string;

  // Bible API State
  realVerseOfTheDay: RealVerse | null;
  currentChapterVerses: RealVerse[] | null;
  searchResults: SearchResult[];
  isApiLoading: boolean;
  apiError: string | null;
  isOnline: boolean;

  // Available Translations
  availableTranslations: TranslationOption[];

  // Actions — Navigation
  navigate: (screen: AppScreen) => void;
  goBack: () => void;

  // Actions — Reading
  setReadingPosition: (pos: Partial<ReadingPosition>) => void;
  updateReaderSettings: (settings: Partial<ReaderSettings>) => void;

  // Actions — Highlights
  addHighlight: (highlight: Omit<Highlight, 'id' | 'createdAt' | 'updatedAt' | 'vectorClock'>) => void;
  removeHighlight: (id: string) => void;
  getHighlightsForChapter: (bookId: number, chapter: number) => Highlight[];

  // Actions — Notes
  saveNote: (note: Omit<VerseNote, 'id' | 'createdAt' | 'updatedAt' | 'vectorClock'>) => void;
  updateNote: (id: string, updates: Partial<VerseNote>) => void;
  deleteNote: (id: string) => void;

  // Actions — Bookmarks
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;

  // Actions — Prayer
  addPrayer: (prayer: Omit<PrayerEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePrayer: (id: string, updates: Partial<PrayerEntry>) => void;
  deletePrayer: (id: string) => void;

  // Actions — Plans
  enrollPlan: (planId: string) => void;
  markDayComplete: (planId: string, day: number) => void;

  // Actions — Progress
  recordReadingSession: (session: Omit<ReadingSession, 'date'>) => void;

  // Actions — Auth & Subscription
  //setProStatus: (status: boolean) => void;
  setCurrentUser: (user: any | null) => void;
  setUserData: (data: any) => void;
  //logout: () => void;

  // Actions — UI
  selectVerse: (verseKey: string) => void;
  deselectVerse: (verseKey: string) => void;
  clearSelectedVerses: () => void;
  openAnnotationToolbar: () => void;
  closeAnnotationToolbar: () => void;
  setCurrentNote: (note: Partial<VerseNote> | null) => void;
  setCurrentPrayer: (prayer: Partial<PrayerEntry> | null) => void;
  setSearchQuery: (query: string) => void;
  addSearchHistory: (query: string) => void;

  // Bible API Actions
  fetchRealVerseOfTheDay: () => Promise<void>;
  fetchChapter: (translation: string, book: string, chapter: number) => Promise<void>;
  fetchVerse: (translation: string, book: string, chapter: number, verse: number) => Promise<RealVerse | null>;
  searchBible: (query: string, translation?: string) => Promise<void>;
  syncOfflineChanges: () => Promise<void>;
  setOnlineStatus: (status: boolean) => void;
  clearApiError: () => void;

  // Translation Actions
  fetchAvailableTranslations: () => Promise<void>;
}

// ─── Helper: Generate ID ──────────────────────────────────────────────────────

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// ─── Helper: Today's date string ─────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

// ─── Load from localStorage ───────────────────────────────────────────────────

const loadPersistedState = () => {
  try {
    const raw = localStorage.getItem('logos-daily-state');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

const persisted = loadPersistedState();


const restoreProStatus = () => {
  try {
    const savedUser = localStorage.getItem('logos_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      const userProStatus = localStorage.getItem(`isPro_${user.uid}`);
      if (userProStatus !== null) {
        return JSON.parse(userProStatus);
      }
    }
    const globalPro = localStorage.getItem('logos_daily_pro');
    if (globalPro !== null) {
      return JSON.parse(globalPro);
    }
  } catch (e) {
    console.error('Failed to restore Pro status:', e);
  }
  return false;
};

// ─── Store Implementation ─────────────────────────────────────────────────────

export const useAppStore = create<AppState>((set, get) => ({
  // Initial State
  currentScreen: 'home',
  previousScreen: null,
  isPro: restoreProStatus(),
  currentUser: null,
  userData: null,

  readingPosition: persisted?.readingPosition ?? {
    bookId: 43,
    book: 'John',
    chapter: 3,
    verse: 1,
    timestamp: Date.now(),
    translation: 'KJV',
  },

  setProStatus: (status) => {
    set({ isPro: status });
    const user = get().currentUser;
    if (user?.uid) {
      localStorage.setItem(`isPro_${user.uid}`, JSON.stringify(status));
    }
    localStorage.setItem('logos_daily_pro', JSON.stringify(status));
  },

  logout: () => {
    const user = get().currentUser;
    if (user?.uid) {
      localStorage.removeItem(`isPro_${user.uid}`);
      localStorage.removeItem(`pro_data_${user.uid}`);
    }
    localStorage.removeItem('logos_daily_pro');
    localStorage.removeItem('logos-daily-user');
    set({ currentUser: null, userData: null, isPro: false });
  },

  readerSettings: persisted?.readerSettings ?? {
    theme: 'classic',
    fontFamily: 'Crimson Pro',
    fontSize: 20,
    lineSpacing: 1.8,
    marginWidth: 24,
    focusMode: false,
    showVerseNumbers: true,
    showFootnotes: true,
    showCrossReferences: true,
    translation: 'KJV',
    parallelTranslation: null,
    viewMode: 'scroll',
    paragraphMode: false,
    redLetterText: true,
  },

  highlights: persisted?.highlights ?? [
    { id: 'h1', bookId: 43, book: 'John', chapter: 3, verse: 16, color: 'yellow', style: 'highlight', createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000, vectorClock: 1 },
    { id: 'h2', bookId: 19, book: 'Psalms', chapter: 23, verse: 1, color: 'blue', style: 'highlight', createdAt: Date.now() - 172800000, updatedAt: Date.now() - 172800000, vectorClock: 1 },
    { id: 'h3', bookId: 45, book: 'Romans', chapter: 8, verse: 28, color: 'green', style: 'highlight', createdAt: Date.now() - 259200000, updatedAt: Date.now() - 259200000, vectorClock: 1 },
    { id: 'h4', bookId: 50, book: 'Philippians', chapter: 4, verse: 13, color: 'pink', style: 'underline', createdAt: Date.now() - 345600000, updatedAt: Date.now() - 345600000, vectorClock: 1 },
  ],

  notes: persisted?.notes ?? [
    {
      id: 'n1', bookId: 43, book: 'John', chapter: 3, verse: 16,
      title: 'The Gospel in One Verse',
      content: 'This is perhaps the most well-known verse in the entire Bible. John 3:16 encapsulates the entire gospel message in a single sentence. Key themes:\n\n• God\'s love is the initiating force\n• The gift is Jesus, God\'s "only begotten Son"\n• The requirement is belief/faith\n• The result is eternal life\n\nNote the parallel structure: "perish" vs "everlasting life" — the contrast between death and life, condemnation and salvation.',
      tags: ['gospel', 'salvation', 'love', 'favorites'],
      createdAt: Date.now() - 86400000, updatedAt: Date.now() - 86400000, vectorClock: 1,
    },
    {
      id: 'n2', bookId: 19, book: 'Psalms', chapter: 23, verse: 4,
      title: 'Walking Through the Valley',
      content: 'The phrase "valley of the shadow of death" (Hebrew: tsalmaveth) can also be translated as "deep darkness" or "shadow of deep darkness." This speaks to any dark period of life, not just physical death.\n\nThe remarkable shift here: David moves from speaking ABOUT God (v.1-3) to speaking TO God ("thou art with me"). In our darkest moments, the relationship becomes personal and immediate.',
      tags: ['comfort', 'faith', 'suffering', 'Psalms'],
      createdAt: Date.now() - 172800000, updatedAt: Date.now() - 172800000, vectorClock: 1,
    },
  ],

  bookmarks: persisted?.bookmarks ?? [
    { id: 'b1', bookId: 43, book: 'John', chapter: 3, verse: 16, label: 'The Gospel', createdAt: Date.now() - 86400000 },
    { id: 'b2', bookId: 19, book: 'Psalms', chapter: 23, verse: 1, label: 'Comfort', createdAt: Date.now() - 172800000 },
    { id: 'b3', bookId: 49, book: 'Ephesians', chapter: 6, verse: 10, label: 'Armor of God', createdAt: Date.now() - 259200000 },
  ],

  prayers: persisted?.prayers ?? [
    {
      id: 'p1',
      title: 'Wisdom for Decisions',
      body: 'Lord, I need your guidance as I face some major life decisions this month. Grant me clarity, peace, and the wisdom to discern your will over my own desires. Help me to trust in Proverbs 3:5-6.',
      status: 'praying',
      tags: ['wisdom', 'guidance', 'personal'],
      createdAt: Date.now() - 86400000 * 5,
      updatedAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'p2',
      title: 'Healing for Mom',
      body: 'Father, you are the Great Physician. Please touch my mother with your healing hand. Give the doctors wisdom and bring comfort to our family during this time.',
      status: 'praying',
      tags: ['healing', 'family'],
      createdAt: Date.now() - 86400000 * 10,
      updatedAt: Date.now() - 86400000 * 10,
    },
    {
      id: 'p3',
      title: 'Job Interview',
      body: 'Thank you Lord for opening this door! Please go before me and give me the words to say. Let your will be done.',
      status: 'answered',
      answeredAt: Date.now() - 86400000 * 3,
      tags: ['provision', 'work', 'answered'],
      createdAt: Date.now() - 86400000 * 14,
      updatedAt: Date.now() - 86400000 * 3,
    },
  ],

  activePlans: persisted?.activePlans ?? [
    {
      planId: 'bible-in-year',
      startDate: Date.now() - 86400000 * 12,
      currentDay: 13,
      completedDays: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      lastReadAt: Date.now() - 86400000,
    },
    {
      planId: 'psalms-proverbs',
      startDate: Date.now() - 86400000 * 3,
      currentDay: 4,
      completedDays: [1, 2, 3],
      lastReadAt: Date.now() - 3600000,
    },
  ],

  streak: persisted?.streak ?? {
    current: 12,
    longest: 28,
    lastReadDate: today(),
    totalDaysRead: 89,
  },

  readingSessions: persisted?.readingSessions ?? [
    { date: '2025-01-01', durationMinutes: 18, chaptersRead: 3, versesRead: 67 },
    { date: '2025-01-02', durationMinutes: 22, chaptersRead: 2, versesRead: 45 },
    { date: '2025-01-03', durationMinutes: 15, chaptersRead: 2, versesRead: 38 },
    { date: '2025-01-04', durationMinutes: 30, chaptersRead: 4, versesRead: 89 },
    { date: '2025-01-05', durationMinutes: 12, chaptersRead: 1, versesRead: 31 },
    { date: '2025-01-06', durationMinutes: 25, chaptersRead: 3, versesRead: 72 },
    { date: '2025-01-07', durationMinutes: 20, chaptersRead: 2, versesRead: 55 },
  ],

  groups: [
    {
      id: 'g1',
      name: 'Morning Grace Community',
      description: 'A small group for daily morning devotionals',
      memberCount: 14,
      isPrivate: true,
      sharedPlanId: 'bible-in-year',
      joinCode: 'MGC-4729',
      role: 'member',
    },
    {
      id: 'g2',
      name: 'Youth Bible Study',
      description: 'Weekly deep dives into Scripture',
      memberCount: 8,
      isPrivate: true,
      sharedPlanId: 'nt-90-days',
      joinCode: 'YBS-8821',
      role: 'admin',
    },
  ],

  dailyVerseIndex: new Date().getDate() % DAILY_VERSES.length,
  searchHistory: ['love', 'faith', 'grace', 'peace'],
  lastSearchQuery: '',
  
  lastSyncAt: Date.now() - 3600000 * 2,
  pendingSyncCount: 3,
  selectedVerses: [],
  isAnnotationToolbarOpen: false,
  currentNote: null,
  currentPrayer: null,
  searchQuery: '',

  // Bible API State
  realVerseOfTheDay: null,
  currentChapterVerses: null,
  searchResults: [],
  isApiLoading: false,
  apiError: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

  // Available Translations
  availableTranslations: [],

  // ─── Actions ───────────────────────────────────────────────────────────────

  navigate: (screen) => {
    const prev = get().currentScreen;
    set({ currentScreen: screen, previousScreen: prev });
  },

  goBack: () => {
    const prev = get().previousScreen;
    if (prev) set({ currentScreen: prev, previousScreen: null });
    else set({ currentScreen: 'home', previousScreen: null });
  },

  setCurrentUser: (user) => set({ currentUser: user }),
  
  setUserData: (data) => set({ userData: data }),

  setReadingPosition: (pos) => {
    const updated = { ...get().readingPosition, ...pos, timestamp: Date.now() };
    set({ readingPosition: updated });
    try {
      const state = get();
      localStorage.setItem('logos-daily-state', JSON.stringify({
        readingPosition: updated,
        readerSettings: state.readerSettings,
        highlights: state.highlights,
        notes: state.notes,
        bookmarks: state.bookmarks,
        prayers: state.prayers,
        activePlans: state.activePlans,
        streak: state.streak,
        readingSessions: state.readingSessions,
      }));
    } catch {}
  },

  updateReaderSettings: (settings) => {
    const updated = { ...get().readerSettings, ...settings };
    set({ readerSettings: updated });
    try {
      const state = get();
      localStorage.setItem('logos-daily-state', JSON.stringify({
        readingPosition: state.readingPosition,
        readerSettings: updated,
        highlights: state.highlights,
        notes: state.notes,
        bookmarks: state.bookmarks,
        prayers: state.prayers,
        activePlans: state.activePlans,
        streak: state.streak,
        readingSessions: state.readingSessions,
      }));
    } catch {}
  },

  addHighlight: (highlight) => {
    const newHighlight: Highlight = {
      ...highlight,
      id: genId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      vectorClock: 1,
    };
    set((state) => ({ highlights: [...state.highlights, newHighlight] }));
    set((s) => { set({ pendingSyncCount: s.pendingSyncCount + 1 }); return s; });
  },

  removeHighlight: (id) => {
    set((state) => ({ highlights: state.highlights.filter(h => h.id !== id) }));
  },

  getHighlightsForChapter: (bookId, chapter) => {
    return get().highlights.filter(h => h.bookId === bookId && h.chapter === chapter);
  },

  saveNote: (note) => {
    const newNote: VerseNote = {
      ...note,
      id: genId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      vectorClock: 1,
    };
    set((state) => ({ 
      notes: [...state.notes, newNote], 
      currentNote: null,
      isAnnotationToolbarOpen: false,
      selectedVerses: []
    }));
  },

  updateNote: (id, updates) => {
    set((state) => ({
      notes: state.notes.map(n =>
        n.id === id ? { ...n, ...updates, updatedAt: Date.now(), vectorClock: n.vectorClock + 1 } : n
      ),
    }));
  },

  deleteNote: (id) => {
    set((state) => ({ notes: state.notes.filter(n => n.id !== id) }));
  },

  addBookmark: (bookmark) => {
    const newBookmark: Bookmark = {
      ...bookmark,
      id: genId(),
      createdAt: Date.now(),
    };
    set((state) => ({ bookmarks: [...state.bookmarks, newBookmark] }));
  },

  removeBookmark: (id) => {
    set((state) => ({ bookmarks: state.bookmarks.filter(b => b.id !== id) }));
  },

  addPrayer: (prayer) => {
    const newPrayer: PrayerEntry = {
      ...prayer,
      id: genId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({ prayers: [...state.prayers, newPrayer], currentPrayer: null }));
  },

  updatePrayer: (id, updates) => {
    set((state) => ({
      prayers: state.prayers.map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
      ),
    }));
  },

  deletePrayer: (id) => {
    set((state) => ({ prayers: state.prayers.filter(p => p.id !== id) }));
  },

  enrollPlan: (planId) => {
    const existing = get().activePlans.find(p => p.planId === planId);
    if (!existing) {
      set((state) => ({
        activePlans: [...state.activePlans, {
          planId,
          startDate: Date.now(),
          currentDay: 1,
          completedDays: [],
          lastReadAt: Date.now(),
        }],
      }));
    }
  },

  markDayComplete: (planId, day) => {
    set((state) => ({
      activePlans: state.activePlans.map(p =>
        p.planId === planId
          ? { ...p, completedDays: [...new Set([...p.completedDays, day])], currentDay: day + 1, lastReadAt: Date.now() }
          : p
      ),
    }));
  },

  recordReadingSession: (session) => {
    const dateStr = today();
    set((state) => {
      const existing = state.readingSessions.find(s => s.date === dateStr);
      const sessions = existing
        ? state.readingSessions.map(s => s.date === dateStr
            ? { ...s, durationMinutes: s.durationMinutes + session.durationMinutes, chaptersRead: s.chaptersRead + session.chaptersRead }
            : s
          )
        : [...state.readingSessions, { ...session, date: dateStr }];

      const streak = { ...state.streak };
      if (streak.lastReadDate !== dateStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        if (streak.lastReadDate === yesterdayStr) {
          streak.current += 1;
        } else {
          streak.current = 1;
        }
        streak.longest = Math.max(streak.longest, streak.current);
        streak.lastReadDate = dateStr;
        streak.totalDaysRead += 1;
      }

      return { readingSessions: sessions, streak };
    });
  },

  // ===== AUTH & SUBSCRIPTION ACTIONS ====

  // ===== UI ACTIONS =====

  selectVerse: (verseKey) => {
    set((state) => ({
      selectedVerses: state.selectedVerses.includes(verseKey)
        ? state.selectedVerses
        : [...state.selectedVerses, verseKey],
      isAnnotationToolbarOpen: true,
    }));
  },

  deselectVerse: (verseKey) => {
    set((state) => ({
      selectedVerses: state.selectedVerses.filter(v => v !== verseKey),
      isAnnotationToolbarOpen: state.selectedVerses.length > 1,
    }));
  },

  clearSelectedVerses: () => {
    set({ selectedVerses: [], isAnnotationToolbarOpen: false });
  },

  openAnnotationToolbar: () => set({ isAnnotationToolbarOpen: true }),
  closeAnnotationToolbar: () => set({ isAnnotationToolbarOpen: false, selectedVerses: [] }),

  setCurrentNote: (note) => set({ currentNote: note }),
  setCurrentPrayer: (prayer) => set({ currentPrayer: prayer }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  addSearchHistory: (query) => {
    set((state) => ({
      searchHistory: [query, ...state.searchHistory.filter(q => q !== query)].slice(0, 20),
    }));
  },

  // ===== BIBLE API ACTIONS =====

  setOnlineStatus: (status) => set({ isOnline: status }),

  clearApiError: () => set({ apiError: null }),

  fetchRealVerseOfTheDay: async () => {
    set({ isApiLoading: true, apiError: null });
    
    const today = new Date().toISOString().split('T')[0];
    const cached = localStorage.getItem(`votd_real_${today}`);
    
    if (cached) {
      try {
        const cachedVerse = JSON.parse(cached);
        set({ realVerseOfTheDay: cachedVerse, isApiLoading: false });
        return;
      } catch (e) {
        console.error('Failed to parse cached VOTD', e);
      }
    }
    
    try {
      const response = await bibleApi.getVerseOfTheDay();
      
      if (response.success && response.data) {
        const verseData: RealVerse = {
          reference: response.data.reference,
          text: response.data.text,
          translation: response.data.translation,
          book: extractBookFromReference(response.data.reference),
          chapter: extractChapterFromReference(response.data.reference),
          verse: extractVerseFromReference(response.data.reference)
        };
        
        localStorage.setItem(`votd_real_${today}`, JSON.stringify(verseData));
        
        set({ realVerseOfTheDay: verseData, isApiLoading: false });
      } else {
        throw new Error('No verse data');
      }
    } catch (error) {
      console.error('Failed to fetch VOTD:', error);
      set({ 
        apiError: 'Unable to load verse of the day',
        isApiLoading: false
      });
    }
  },

  // In appStore.ts - Check this function
  fetchChapter: async (translation: string, book: string, chapter: number) => {
    console.log(`📖 Store: fetchChapter called for ${translation}/${book}/${chapter}`);
    set({ isApiLoading: true, apiError: null });
  
    const cacheKey = `${translation}:${book}:${chapter}`;
    const cached = localStorage.getItem(`chapter_${cacheKey}`);
  
    if (cached) {
      try {
        const cachedData = JSON.parse(cached);
        if (Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000) {
          console.log(`📦 Store: Cache hit for ${cacheKey}`);
          set({ currentChapterVerses: cachedData.data, isApiLoading: false });
          return;
        }
      } catch (e) {
        console.error('Failed to parse cached chapter', e);
      }
    }
  
    try {
      console.log(`📡 Store: Fetching from API: ${translation}/${book}/${chapter}`);
      const response = await bibleApi.getChapter(translation, book, chapter);
      console.log(`📥 Store: API Response:`, response);
    
      if (response.success && response.data) {
      // Log the data structure
        console.log(`📥 Store: Data structure:`, {
          type: typeof response.data,
          isArray: Array.isArray(response.data),
          length: response.data.length,
          firstItem: response.data[0]
        });
      
        // Ensure we have valid verses
        let verses = response.data;
      
        // If data is an array, use it directly
        if (Array.isArray(verses) && verses.length > 0) {
          const formattedVerses = verses.map((v: any) => ({
            reference: `${v.book} ${v.chapter}:${v.verse}`,
            text: v.text,
            translation: translation,
            book: v.book,
            chapter: v.chapter,
            verse: v.verse
          }));
        
          console.log(`✅ Store: Formatted ${formattedVerses.length} verses`);
        
          localStorage.setItem(`chapter_${cacheKey}`, JSON.stringify({
            data: formattedVerses,
            timestamp: Date.now()
          }));
        
          set({ currentChapterVerses: formattedVerses, isApiLoading: false });
        } else {
          console.warn('⚠️ Store: No verses in response');
          set({ currentChapterVerses: [], isApiLoading: false });
        }
      } else {
        throw new Error(response.error || 'Failed to fetch chapter');
      }
    } catch (error) {
      console.error('❌ Store: Failed to fetch chapter:', error);
      set({ 
        apiError: `Unable to load ${book} ${chapter}`,
        isApiLoading: false 
      });
    }
  },

  fetchVerse: async (translation, book, chapter, verse) => {
    const cacheKey = `${translation}:${book}:${chapter}:${verse}`;
    const cached = localStorage.getItem(`verse_${cacheKey}`);
    
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error('Failed to parse cached verse', e);
      }
    }
    
    try {
      const response = await bibleApi.getVerse(translation, book, chapter, verse);
      
      if (response.success && response.data && response.data[0]) {
        const verseData: RealVerse = {
          reference: `${response.data[0].book} ${response.data[0].chapter}:${response.data[0].verse}`,
          text: response.data[0].text,
          translation: translation,
          book: response.data[0].book,
          chapter: response.data[0].chapter,
          verse: response.data[0].verse
        };
        
        localStorage.setItem(`verse_${cacheKey}`, JSON.stringify(verseData));
        return verseData;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch verse:', error);
      return null;
    }
  },

  searchBible: async (query, translation = 'KJV') => {
    set({ isApiLoading: true, apiError: null });
    
    get().addSearchHistory(query);
    
    try {
      const response = await bibleApi.search(query, translation);
      
      if (response.success && response.results) {
        const results: SearchResult[] = response.results.map((result: any) => ({
          reference: result.reference,
          text: result.text,
          translation: translation,
          book: extractBookFromReference(result.reference),
          chapter: extractChapterFromReference(result.reference),
          verse: extractVerseFromReference(result.reference)
        }));
        
        set({ searchResults: results, isApiLoading: false });
      } else {
        set({ searchResults: [], isApiLoading: false });
      }
    } catch (error) {
      console.error('Search failed:', error);
      set({ 
        apiError: 'Search failed. Please try again.',
        searchResults: [],
        isApiLoading: false 
      });
    }
  },

  syncOfflineChanges: async () => {
    const { highlights, notes, isOnline } = get();
    
    if (!isOnline) {
      console.log('📡 Offline: changes queued for sync');
      return;
    }
    
    const unsyncedHighlights = highlights.filter(h => !('synced' in h) || !(h as any).synced);
    const unsyncedNotes = notes.filter(n => !('synced' in n) || !(n as any).synced);
    
    if (unsyncedHighlights.length === 0 && unsyncedNotes.length === 0) {
      return;
    }
    
    console.log(`🔄 Syncing ${unsyncedHighlights.length} highlights and ${unsyncedNotes.length} notes...`);

    const operations = [
      ...unsyncedHighlights.map(highlight => ({ type: 'highlight', data: highlight })),
      ...unsyncedNotes.map(note => ({ type: 'note', data: note })),
    ];

    try {
      const response = await bibleApi.syncOfflineData(operations);

      if (!response.success) {
        console.error('Failed to sync offline changes:', response.error);
        return;
      }

      set(state => ({
        highlights: state.highlights.map(h =>
          unsyncedHighlights.some(uh => uh.id === h.id) ? { ...h, synced: true } : h
        ),
        notes: state.notes.map(n =>
          unsyncedNotes.some(un => un.id === n.id) ? { ...n, synced: true } : n
        ),
      }));
    } catch (error) {
      console.error('Failed to sync offline changes:', error);
      return;
    }

    set({ pendingSyncCount: 0 });
    console.log('✅ Sync complete');
  },

  // ===== TRANSLATION ACTIONS =====

  fetchAvailableTranslations: async () => {
    try {
      const response = await bibleApi.get('/bible/translations');
      if (response.success) {
        set({ availableTranslations: response.translations });
      }
    } catch (error) {
      console.error('Failed to fetch translations:', error);
    }
  },
}));

// ===== HELPER FUNCTIONS =====

function extractBookFromReference(reference: string): string {
  const match = reference.match(/^[A-Za-z\s]+(?=\s\d+)/);
  return match ? match[0].trim() : 'John';
}

function extractChapterFromReference(reference: string): number {
  const match = reference.match(/\d+(?=:\d+)/);
  return match ? parseInt(match[0]) : 1;
}

function extractVerseFromReference(reference: string): number {
  const match = reference.match(/(?<=:)\d+/);
  return match ? parseInt(match[0]) : 1;
}

// ===== EVENT LISTENERS =====

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 App is online, syncing...');
    useAppStore.getState().setOnlineStatus(true);
    useAppStore.getState().syncOfflineChanges();
  });
  
  window.addEventListener('offline', () => {
    console.log('📡 App is offline, changes will be queued');
    useAppStore.getState().setOnlineStatus(false);
  });
}