/**
 * Logos Daily — Reading Plans Screen
 * ====================================
 * Browse and track Bible reading plans with:
 * - Active plans progress tracking
 * - Daily reading assignments
 * - Real Bible content from API
 * - Pro plan restrictions
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useBibleChapter } from '../hooks/useRealBibleData';
import { getTheme } from '../utils/themeUtils';
import { BIBLE_BOOKS } from '../data/bibleData';
import { 
  ChevronRight, 
  BookOpen, 
  Calendar, 
  CheckCircle, 
  Loader2, 
  ArrowLeft,
  Target,
  Flame,
  WifiOff,
  RefreshCw,
  Clock,
  Award,
  TrendingUp,
  Star,
  Crown,
  Lock
} from 'lucide-react';

// Reading Plans Data
const READING_PLANS_DATA = [
  {
    id: 'bible-in-year',
    name: 'Bible in a Year',
    icon: '📖',
    duration: 365,
    description: 'Read through the entire Bible in one year with daily readings from the Old and New Testaments.',
    category: 'Comprehensive',
    isPro: false,
    readings: generateReadings(365)
  },
  {
    id: 'psalms-proverbs',
    name: 'Psalms & Proverbs',
    icon: '📜',
    duration: 31,
    description: 'A chapter from Psalms and a chapter from Proverbs each day for a month.',
    category: 'Wisdom',
    isPro: false,
    readings: generatePsalmsProverbsReadings()
  },
  {
    id: 'nt-90-days',
    name: 'New Testament in 90 Days',
    icon: '✝️',
    duration: 90,
    description: 'Journey through all 27 books of the New Testament in 90 days.',
    category: 'New Testament',
    isPro: true,  // ← PRO PLAN
    readings: generateNTReadings()
  },
  {
    id: 'jesus-miracles',
    name: 'Jesus\' Miracles',
    icon: '✨',
    duration: 21,
    description: 'A thematic 21-day study of all the recorded miracles of Jesus across all four gospels.',
    category: 'Thematic',
    isPro: true,  // ← PRO PLAN
    readings: generateMiraclesReadings()
  },
  {
    id: 'chronological',
    name: 'Chronological Bible',
    icon: '⏳',
    duration: 365,
    description: 'Read the Bible in the order events actually occurred, blending books for historical context.',
    category: 'Historical',
    isPro: true,  // ← PRO PLAN
    readings: generateReadings(365)
  },
  {
    id: 'sermon-on-mount',
    name: 'Sermon on the Mount',
    icon: '🏔️',
    duration: 7,
    description: 'An intensive 7-day meditation on the greatest sermon ever preached (Matthew 5-7).',
    category: 'Thematic',
    isPro: true,  // ← PRO PLAN
    readings: generateSermonReadings()
  }
];

// Helper functions to generate readings
function generateReadings(days: number) {
  const readings = [];
  const books = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'];
  
  for (let i = 1; i <= days; i++) {
    const bookIndex = Math.floor((i - 1) * books.length / days);
    readings.push({
      day: i,
      book: books[bookIndex],
      chapter: (i % 30) + 1,
      startVerse: 1,
      endVerse: 20
    });
  }
  return readings;
}

function generatePsalmsProverbsReadings() {
  const readings = [];
  for (let i = 1; i <= 31; i++) {
    readings.push({
      day: i,
      book: 'Psalms',
      chapter: i,
      startVerse: 1,
      endVerse: 20,
      title: `Psalm ${i}`
    });
  }
  return readings;
}

function generateNTReadings() {
  const ntBooks = ['Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'];
  const readings = [];
  for (let i = 1; i <= 90; i++) {
    const bookIndex = Math.floor((i - 1) * ntBooks.length / 90);
    readings.push({
      day: i,
      book: ntBooks[bookIndex],
      chapter: ((i - 1) % 20) + 1,
      startVerse: 1,
      endVerse: 15,
      title: `${ntBooks[bookIndex]} ${((i - 1) % 20) + 1}`
    });
  }
  return readings;
}

function generateMiraclesReadings() {
  const miracles = [
    { book: 'Matthew', chapter: 8, startVerse: 1, endVerse: 4, title: 'Healing a Leper' },
    { book: 'Matthew', chapter: 8, startVerse: 5, endVerse: 13, title: 'Healing the Centurion\'s Servant' },
    { book: 'Matthew', chapter: 8, startVerse: 14, endVerse: 15, title: 'Healing Peter\'s Mother-in-Law' },
    { book: 'Matthew', chapter: 8, startVerse: 23, endVerse: 27, title: 'Calming the Storm' },
    { book: 'Matthew', chapter: 9, startVerse: 1, endVerse: 8, title: 'Healing a Paralytic' },
    { book: 'Matthew', chapter: 9, startVerse: 20, endVerse: 22, title: 'Healing a Woman with Bleeding' },
    { book: 'Matthew', chapter: 9, startVerse: 27, endVerse: 31, title: 'Healing Two Blind Men' },
    { book: 'Matthew', chapter: 12, startVerse: 9, endVerse: 14, title: 'Healing a Man\'s Withered Hand' },
    { book: 'Matthew', chapter: 14, startVerse: 13, endVerse: 21, title: 'Feeding the 5000' },
    { book: 'Matthew', chapter: 14, startVerse: 22, endVerse: 33, title: 'Walking on Water' },
    { book: 'Matthew', chapter: 15, startVerse: 21, endVerse: 28, title: 'Healing a Canaanite Woman\'s Daughter' },
    { book: 'Matthew', chapter: 15, startVerse: 32, endVerse: 39, title: 'Feeding the 4000' },
    { book: 'Matthew', chapter: 17, startVerse: 14, endVerse: 20, title: 'Healing a Demon-Possessed Boy' },
    { book: 'Matthew', chapter: 20, startVerse: 29, endVerse: 34, title: 'Healing Two Blind Men' },
    { book: 'Mark', chapter: 2, startVerse: 1, endVerse: 12, title: 'Healing a Paralytic' },
    { book: 'Luke', chapter: 7, startVerse: 11, endVerse: 17, title: 'Raising a Widow\'s Son' },
    { book: 'Luke', chapter: 13, startVerse: 10, endVerse: 17, title: 'Healing a Crippled Woman' },
    { book: 'Luke', chapter: 17, startVerse: 11, endVerse: 19, title: 'Healing Ten Lepers' },
    { book: 'John', chapter: 2, startVerse: 1, endVerse: 11, title: 'Turning Water into Wine' },
    { book: 'John', chapter: 4, startVerse: 46, endVerse: 54, title: 'Healing an Official\'s Son' },
    { book: 'John', chapter: 5, startVerse: 1, endVerse: 15, title: 'Healing the Invalid' }
  ];
  
  return miracles.slice(0, 21).map((miracle, index) => ({
    day: index + 1,
    book: miracle.book,
    chapter: miracle.chapter,
    startVerse: miracle.startVerse,
    endVerse: miracle.endVerse,
    title: miracle.title
  }));
}

function generateSermonReadings() {
  const readings = [];
  for (let i = 1; i <= 7; i++) {
    readings.push({
      day: i,
      book: 'Matthew',
      chapter: 5,
      startVerse: (i - 1) * 8 + 1,
      endVerse: Math.min(i * 8, 48),
      title: `Beatitudes - Day ${i}`
    });
  }
  return readings;
}

// Plan Card Component
const PlanCard: React.FC<{
  plan: any;
  activePlan?: any;
  onStart: () => void;
  onView: () => void;
  isPro: boolean;
  theme: any;
}> = ({ plan, activePlan, onStart, onView, isPro, theme }) => {
  const progress = activePlan ? (activePlan.completedDays.length / plan.duration) * 100 : 0;
  const isLocked = plan.isPro && !isPro;
  
  return (
    <div
      className={`rounded-2xl p-4 transition-all ${!isLocked ? 'active:scale-[0.99]' : ''}`}
      style={{ 
        backgroundColor: theme.card, 
        border: `1px solid ${theme.border}`,
        opacity: isLocked ? 0.7 : 1
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{plan.icon}</span>
        <div className="flex-1">
          <h3 className="font-bold" style={{ color: theme.text }}>{plan.name}</h3>
          <p className="text-xs" style={{ color: theme.textMuted }}>
            {plan.duration} days · {plan.category}
          </p>
        </div>
        {plan.isPro && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>
            PRO
          </span>
        )}
      </div>
      
      <p className="text-xs mb-3" style={{ color: theme.textMuted }}>
        {plan.description}
      </p>
      
      {activePlan && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: theme.textMuted }}>Progress</span>
            <span className="text-xs font-medium" style={{ color: theme.accent }}>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: theme.accent }} />
          </div>
          <p className="text-xs mt-2" style={{ color: theme.accent }}>
            Day {activePlan.currentDay} of {plan.duration}
          </p>
        </div>
      )}
      
      {isLocked ? (
        <button
          disabled
          className="w-full py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
          style={{ backgroundColor: theme.surface, color: theme.textMuted }}
        >
          <Lock size={14} /> Pro Feature
        </button>
      ) : (
        <button
          onClick={activePlan ? onView : onStart}
          className="w-full py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{
            backgroundColor: activePlan ? `${theme.accent}20` : theme.accent,
            color: activePlan ? theme.accent : 'white'
          }}
        >
          {activePlan ? 'Continue →' : 'Start'}
        </button>
      )}
    </div>
  );
};

// Plan Detail View Component
const PlanDetailView: React.FC<{
  plan: any;
  activePlan: any;
  onBack: () => void;
  onMarkDayComplete: (day: number) => void;
  isPro: boolean;
  theme: any;
}> = ({ plan, activePlan, onBack, onMarkDayComplete, isPro, theme }) => {
  const [selectedDay, setSelectedDay] = useState(activePlan?.currentDay || 1);
  const todayReading = plan.readings.find((r: any) => r.day === selectedDay);
  const isTodayCompleted = activePlan?.completedDays.includes(selectedDay);
  const isLocked = plan.isPro && !isPro;
  
  // Fetch today's reading content
  const { verses, isLoading, error, isOffline } = useBibleChapter(
    todayReading?.book || 'John',
    todayReading?.chapter || 1,
    'KJV'
  );
  
  const progress = activePlan ? (activePlan.completedDays.length / plan.duration) * 100 : 0;
  
  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Lock size={48} style={{ color: theme.accent }} />
        <h3 className="text-lg font-bold mt-4 mb-2" style={{ color: theme.text }}>Pro Plan Required</h3>
        <p className="text-sm mb-6" style={{ color: theme.textMuted }}>
          This reading plan is only available for Logos Pro subscribers.
        </p>
        <button
          onClick={() => window.location.href = '/subscription'}
          className="px-6 py-3 rounded-xl font-semibold"
          style={{ backgroundColor: theme.accent, color: 'white' }}
        >
          Upgrade to Pro
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm mb-4"
        style={{ color: theme.accent }}
      >
        <ArrowLeft size={16} /> Back to Plans
      </button>
      
      {/* Plan Header */}
      <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: theme.surface }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Target size={16} style={{ color: theme.accent }} />
          <span className="text-sm font-medium" style={{ color: theme.textMuted }}>Progress</span>
        </div>
        <p className="text-3xl font-bold mb-1" style={{ color: theme.text }}>
          {activePlan?.completedDays.length || 0}/{plan.duration}
        </p>
        <div className="h-2 rounded-full overflow-hidden mt-2" style={{ backgroundColor: theme.border }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: theme.accent }} />
        </div>
        <p className="text-xs mt-2" style={{ color: theme.accent }}>
          {Math.round(progress)}% complete
        </p>
      </div>
      
      {/* Day Selector */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
        <h3 className="font-bold text-sm mb-3" style={{ color: theme.text }}>Select Day</h3>
        <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto">
          {Array.from({ length: Math.min(plan.duration, 35) }, (_, i) => i + 1).map(day => {
            const isCompleted = activePlan?.completedDays.includes(day);
            const isCurrent = day === selectedDay;
            
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                  isCompleted ? 'bg-green-500' : isCurrent ? 'bg-amber-600' : ''
                }`}
                style={{
                  backgroundColor: isCompleted ? '#4CAF50' : isCurrent ? theme.accent : theme.surface,
                  color: (isCompleted || isCurrent) ? 'white' : theme.text,
                  border: `1px solid ${isCurrent ? theme.accent : theme.border}`,
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Today's Reading Content */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold" style={{ color: theme.text }}>
              Day {selectedDay}: {todayReading?.title || `${todayReading?.book} ${todayReading?.chapter}`}
            </h3>
            <p className="text-xs mt-1" style={{ color: theme.accent }}>
              {todayReading?.book} {todayReading?.chapter}:{todayReading?.startVerse}-{todayReading?.endVerse || 30}
            </p>
          </div>
          {isOffline && <WifiOff size={14} style={{ color: '#f59e0b' }} />}
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin" style={{ color: theme.accent }} />
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-sm" style={{ color: '#dc2626' }}>Unable to load reading</p>
          </div>
        ) : verses && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {verses.slice(0, 15).map(verse => (
              <p key={verse.verse} className="text-sm leading-relaxed" style={{ color: theme.text }}>
                <sup className="text-xs mr-1.5" style={{ color: theme.accent }}>{verse.verse}</sup>
                {verse.text}
              </p>
            ))}
          </div>
        )}
        
        {!isTodayCompleted && selectedDay === (activePlan?.currentDay || 1) && activePlan && (
          <button
            onClick={() => onMarkDayComplete(selectedDay)}
            className="w-full mt-4 py-3 rounded-xl font-semibold text-sm"
            style={{ backgroundColor: theme.accent, color: 'white' }}
          >
            Mark Day {selectedDay} Complete ✓
          </button>
        )}
        
        {isTodayCompleted && selectedDay === (activePlan?.currentDay || 1) && (
          <div className="flex items-center justify-center gap-2 mt-4 py-2 rounded-xl" style={{ backgroundColor: `${theme.accent}20` }}>
            <CheckCircle size={16} style={{ color: theme.accent }} />
            <span className="text-sm font-medium" style={{ color: theme.accent }}>Day Complete!</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Component
const ReadingPlansScreen: React.FC = () => {
  const { readerSettings, navigate, isPro, activePlans, markDayComplete, enrollPlan } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  
  const selectedPlan = selectedPlanId ? READING_PLANS_DATA.find(p => p.id === selectedPlanId) : null;
  const activePlan = selectedPlanId ? activePlans.find(p => p.planId === selectedPlanId) : null;
  
  const handleStartPlan = (planId: string) => {
    const plan = READING_PLANS_DATA.find(p => p.id === planId);
    if (plan?.isPro && !isPro) {
      // Show upgrade prompt
      alert('This is a Pro plan. Please upgrade to Logos Pro to access this plan.');
      return;
    }
    enrollPlan(planId);
    setSelectedPlanId(planId);
  };
  
  const handleMarkDayComplete = (day: number) => {
    if (selectedPlanId) {
      markDayComplete(selectedPlanId, day);
    }
  };
  
  // Separate plans into free and pro
  const freePlans = READING_PLANS_DATA.filter(p => !p.isPro);
  const proPlans = READING_PLANS_DATA.filter(p => p.isPro);
  
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => selectedPlanId ? setSelectedPlanId(null) : navigate('home')} style={{ color: theme.textMuted }}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif' }}>
            {selectedPlanId ? selectedPlan?.name : 'Reading Plans'}
          </h1>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {!selectedPlanId ? (
          <>
            {/* Active Plans Section */}
            {activePlans.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>
                  ✦ Active Plans
                </h2>
                <div className="space-y-3">
                  {activePlans.map(active => {
                    const plan = READING_PLANS_DATA.find(p => p.id === active.planId);
                    if (!plan) return null;
                    return (
                      <PlanCard
                        key={active.planId}
                        plan={plan}
                        activePlan={active}
                        onStart={() => {}}
                        onView={() => setSelectedPlanId(active.planId)}
                        isPro={isPro}
                        theme={theme}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Free Plans Section */}
            <div className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>
                ✦ Free Plans
              </h2>
              <div className="space-y-3">
                {freePlans.filter(plan => !activePlans.some(p => p.planId === plan.id)).map(plan => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onStart={() => handleStartPlan(plan.id)}
                    onView={() => {}}
                    isPro={isPro}
                    theme={theme}
                  />
                ))}
              </div>
            </div>
            
            {/* Pro Plans Section - Only shown if not Pro, otherwise show with active plans */}
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: theme.textMuted }}>
                <Crown size={12} style={{ color: theme.accent }} />
                Pro Plans
              </h2>
              <div className="space-y-3">
                {proPlans.filter(plan => !activePlans.some(p => p.planId === plan.id)).map(plan => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onStart={() => handleStartPlan(plan.id)}
                    onView={() => {}}
                    isPro={isPro}
                    theme={theme}
                  />
                ))}
              </div>
            </div>
            
            {/* Pro Upsell - Only show if not Pro */}
            {!isPro && (
              <div className="mt-6 rounded-2xl p-4" style={{ background: `linear-gradient(135deg, ${theme.accent}22, ${theme.accent}08)`, border: `1px solid ${theme.accent}33` }}>
                <div className="flex items-center gap-3">
                  <Crown size={24} style={{ color: theme.accent }} />
                  <div className="flex-1">
                    <h3 className="font-bold text-sm" style={{ color: theme.text }}>Unlock All Plans</h3>
                    <p className="text-xs" style={{ color: theme.textMuted }}>Get access to 50+ reading plans with Logos Pro</p>
                  </div>
                  <button
                    onClick={() => navigate('subscription')}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: theme.accent, color: 'white' }}
                  >
                    Upgrade
                  </button>
                </div>
              </div>
            )}
          </>
        ) : selectedPlan && (
          <PlanDetailView
            plan={selectedPlan}
            activePlan={activePlan}
            onBack={() => setSelectedPlanId(null)}
            onMarkDayComplete={handleMarkDayComplete}
            isPro={isPro}
            theme={theme}
          />
        )}
        <div className="h-20" />
      </div>
    </div>
  );
};

export default ReadingPlansScreen;