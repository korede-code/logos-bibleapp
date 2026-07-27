// src/components/ReadingPlansScreen.tsx - COMPLETE FIXED VERSION

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useBibleChapter } from '../hooks/useRealBibleData';
import { getTheme } from '../utils/themeUtils';
import { BIBLE_BOOKS } from '../data/bibleData';
import { 
  ChevronRight, BookOpen, Calendar, CheckCircle, Loader2, ArrowLeft,
  Target, WifiOff, RefreshCw, Star, Crown, Lock
} from 'lucide-react';
import ProUpgradeModal from './ProUpgradeModal';

// Complete chapters per book
const BOOK_CHAPTERS: Record<string, number> = {
  'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
  'Joshua': 24, 'Judges': 21, 'Ruth': 4, '1 Samuel': 31, '2 Samuel': 24,
  '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36,
  'Ezra': 10, 'Nehemiah': 13, 'Esther': 10, 'Job': 42,
  'Psalms': 150, 'Proverbs': 31, 'Ecclesiastes': 12, 'Song of Solomon': 8,
  'Isaiah': 66, 'Jeremiah': 52, 'Lamentations': 5, 'Ezekiel': 48, 'Daniel': 12,
  'Hosea': 14, 'Joel': 3, 'Amos': 9, 'Obadiah': 1, 'Jonah': 4, 'Micah': 7,
  'Nahum': 3, 'Habakkuk': 3, 'Zephaniah': 3, 'Haggai': 2, 'Zechariah': 14, 'Malachi': 4,
  'Matthew': 28, 'Mark': 16, 'Luke': 24, 'John': 21, 'Acts': 28,
  'Romans': 16, '1 Corinthians': 16, '2 Corinthians': 13, 'Galatians': 6, 'Ephesians': 6,
  'Philippians': 4, 'Colossians': 4, '1 Thessalonians': 5, '2 Thessalonians': 3,
  '1 Timothy': 6, '2 Timothy': 4, 'Titus': 3, 'Philemon': 1, 'Hebrews': 13,
  'James': 5, '1 Peter': 5, '2 Peter': 3, '1 John': 5, '2 John': 1, '3 John': 1, 'Jude': 1,
  'Revelation': 22
};

// Generate readings with 3-4 chapters per day
function generateBibleInYearReadings() {
  const readings: any[] = [];
  const books = Object.keys(BOOK_CHAPTERS);
  
  // Collect ALL chapters as a flat list
  const allChapters: Array<{ book: string; chapter: number }> = [];
  for (const book of books) {
    const numChapters = BOOK_CHAPTERS[book];
    for (let ch = 1; ch <= numChapters; ch++) {
      allChapters.push({ book, chapter: ch });
    }
  }
  
  // Distribute across 365 days (3-4 chapters per day)
  const totalChapters = allChapters.length; // 1189 chapters
  const chaptersPerDay = totalChapters / 365; // ~3.26 chapters per day
  
  let chapterIndex = 0;
  for (let day = 1; day <= 365; day++) {
    const startIndex = chapterIndex;
    const numChaptersToday = Math.round((day * chaptersPerDay) - chapterIndex);
    const endIndex = Math.min(startIndex + numChaptersToday, totalChapters);
    
    for (let i = startIndex; i < endIndex; i++) {
      if (allChapters[i]) {
        readings.push({
          day: day,
          book: allChapters[i].book,
          chapter: allChapters[i].chapter,
          title: `${allChapters[i].book} ${allChapters[i].chapter}`,
        });
      }
    }
    
    chapterIndex = endIndex;
  }
  
  return readings;
}

function generatePsalmsProverbsReadings() {
  const readings: any[] = [];
  
  // Day 1-31: One Psalm + One Proverb each day
  for (let day = 1; day <= 31; day++) {
    // Psalm chapter (1-31)
    if (day <= 150) {
      readings.push({
        day: day,
        book: 'Psalms',
        chapter: day,
        title: `Psalm ${day}`,
      });
    }
    // Proverbs chapter (1-31)
    if (day <= 31) {
      readings.push({
        day: day,
        book: 'Proverbs',
        chapter: day,
        title: `Proverbs ${day}`,
      });
    }
  }
  
  return readings;
}

function generateNT90Readings() {
  const readings: any[] = [];
  const ntBooks = ['Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'];
  
  const allChapters: Array<{ book: string; chapter: number }> = [];
  for (const book of ntBooks) {
    const numChapters = BOOK_CHAPTERS[book] || 1;
    for (let ch = 1; ch <= numChapters; ch++) {
      allChapters.push({ book, chapter: ch });
    }
  }
  
  const totalChapters = allChapters.length;
  const chaptersPerDay = totalChapters / 90;
  
  let chapterIndex = 0;
  for (let day = 1; day <= 90; day++) {
    const startIndex = chapterIndex;
    const numChaptersToday = Math.round((day * chaptersPerDay) - chapterIndex);
    const endIndex = Math.min(startIndex + numChaptersToday, totalChapters);
    
    for (let i = startIndex; i < endIndex; i++) {
      if (allChapters[i]) {
        readings.push({
          day: day,
          book: allChapters[i].book,
          chapter: allChapters[i].chapter,
          title: `${allChapters[i].book} ${allChapters[i].chapter}`,
        });
      }
    }
    
    chapterIndex = endIndex;
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
  const readings = [
    { day: 1, book: 'Matthew', chapter: 5, startVerse: 1, endVerse: 12, title: 'The Beatitudes (Matthew 5:1-12)' },
    { day: 2, book: 'Matthew', chapter: 5, startVerse: 13, endVerse: 20, title: 'Salt and Light (Matthew 5:13-20)' },
    { day: 3, book: 'Matthew', chapter: 5, startVerse: 21, endVerse: 32, title: 'Anger, Lust & Divorce (Matthew 5:21-32)' },
    { day: 4, book: 'Matthew', chapter: 5, startVerse: 33, endVerse: 48, title: 'Oaths & Love for Enemies (Matthew 5:33-48)' },
    { day: 5, book: 'Matthew', chapter: 6, startVerse: 1, endVerse: 18, title: 'Giving, Prayer & Fasting (Matthew 6:1-18)' },
    { day: 6, book: 'Matthew', chapter: 6, startVerse: 19, endVerse: 34, title: 'Treasures & Do Not Worry (Matthew 6:19-34)' },
    { day: 7, book: 'Matthew', chapter: 7, startVerse: 1, endVerse: 29, title: 'Judging & The Narrow Gate (Matthew 7:1-29)' },
  ];
  
  return readings;
}

function generateFruitOfSpiritReadings() {
  const readings = [
    { day: 1, book: 'Galatians', chapter: 5, startVerse: 16, endVerse: 26, title: 'Walking by the Spirit' },
    { day: 2, book: '1 Corinthians', chapter: 13, startVerse: 1, endVerse: 13, title: 'Love - The Greatest Gift' },
    { day: 3, book: 'Philippians', chapter: 4, startVerse: 4, endVerse: 9, title: 'Joy & Peace in Christ' },
    { day: 4, book: 'James', chapter: 1, startVerse: 1, endVerse: 12, title: 'Patience in Trials' },
    { day: 5, book: 'Colossians', chapter: 3, startVerse: 12, endVerse: 17, title: 'Kindness & Goodness' },
    { day: 6, book: 'Hebrews', chapter: 11, startVerse: 1, endVerse: 40, title: 'Faithfulness of the Heroes' },
    { day: 7, book: 'Proverbs', chapter: 15, startVerse: 1, endVerse: 33, title: 'Gentleness & Wisdom' },
    { day: 8, book: '2 Peter', chapter: 1, startVerse: 3, endVerse: 11, title: 'Self-Control & Growth' },
    { day: 9, book: 'Romans', chapter: 12, startVerse: 1, endVerse: 21, title: 'Living Sacrifice & Love' },
    { day: 10, book: '1 John', chapter: 4, startVerse: 7, endVerse: 21, title: 'Perfect Love Casts Out Fear' },
  ];
  return readings;
}

function generateProverbs31Readings() {
  const readings = [];
  for (let day = 1; day <= 31; day++) {
    const proverbs = {
      1: 'The Beginning of Knowledge',
      2: 'The Value of Wisdom',
      3: 'Trust in the Lord',
      4: 'Security in Wisdom',
      5: 'Warning Against Adultery',
      6: 'Warnings Against Folly',
      7: 'Warning Against the Adulteress',
      8: 'The Excellence of Wisdom',
      9: 'The Way of Wisdom',
      10: 'Wise Sayings of Solomon',
      11: 'Dishonest Scales',
      12: 'The Righteous and the Wicked',
      13: 'A Wise Son',
      14: 'The Wise Woman',
      15: 'A Soft Answer',
      16: 'The Plans of the Heart',
      17: 'Better a Dry Morsel',
      18: 'The Name of the Lord',
      19: 'Better is the Poor',
      20: 'Wine is a Mocker',
      21: 'The King\'s Heart',
      22: 'A Good Name',
      23: 'When You Sit to Eat',
      24: 'Do Not Envy Evil Men',
      25: 'Hezekiah\'s Proverbs',
      26: 'Honor is Not Fitting for a Fool',
      27: 'Do Not Boast About Tomorrow',
      28: 'The Wicked Flee',
      29: 'He Who is Often Rebuked',
      30: 'The Wisdom of Agur',
      31: 'The Virtuous Wife',
    };
    readings.push({
      day,
      book: 'Proverbs',
      chapter: day,
      startVerse: 1,
      endVerse: 999,
      title: `Proverbs ${day}: ${proverbs[day] || 'Wisdom'}`,
    });
  }
  return readings;
}

function generateGospelOfJohnReadings() {
  const readings = [];
  for (let day = 1; day <= 21; day++) {
    const chapter = day;
    const titles: Record<number, string> = {
      1: 'The Word Became Flesh',
      2: 'Water to Wine & Temple Cleansing',
      3: 'You Must Be Born Again',
      4: 'The Samaritan Woman',
      5: 'Healing at the Pool',
      6: 'I Am the Bread of Life',
      7: 'Rivers of Living Water',
      8: 'I Am the Light of the World',
      9: 'Healing the Blind Man',
      10: 'The Good Shepherd',
      11: 'Lazarus Raised from Death',
      12: 'The Triumphal Entry',
      13: 'Jesus Washes Feet',
      14: 'I Am the Way',
      15: 'The True Vine',
      16: 'The Helper Will Come',
      17: 'Jesus\' High Priestly Prayer',
      18: 'Betrayal and Arrest',
      19: 'The Crucifixion',
      20: 'The Resurrection',
      21: 'Breakfast by the Sea',
    };
    readings.push({
      day,
      book: 'John',
      chapter,
      startVerse: 1,
      endVerse: 999,
      title: titles[chapter] || `John ${chapter}`,
    });
  }
  return readings;
}

function generateArmorOfGodReadings() {
  return [
    { day: 1, book: 'Ephesians', chapter: 6, startVerse: 10, endVerse: 18, title: 'The Full Armor of God' },
    { day: 2, book: 'Isaiah', chapter: 59, startVerse: 1, endVerse: 21, title: 'The Armor of Righteousness' },
    { day: 3, book: 'Romans', chapter: 13, startVerse: 11, endVerse: 14, title: 'Put On Christ' },
    { day: 4, book: '2 Corinthians', chapter: 10, startVerse: 1, endVerse: 6, title: 'Spiritual Weapons' },
    { day: 5, book: '1 Thessalonians', chapter: 5, startVerse: 1, endVerse: 11, title: 'Breastplate of Faith & Love' },
    { day: 6, book: '1 Peter', chapter: 5, startVerse: 6, endVerse: 11, title: 'Stand Firm Against the Devil' },
    { day: 7, book: 'James', chapter: 4, startVerse: 1, endVerse: 10, title: 'Submit to God, Resist the Devil' },
  ];
}

function generatePsalmsOfComfortReadings() {
  return [
    { day: 1, book: 'Psalms', chapter: 23, startVerse: 1, endVerse: 6, title: 'The Lord is My Shepherd' },
    { day: 2, book: 'Psalms', chapter: 27, startVerse: 1, endVerse: 14, title: 'The Lord is My Light' },
    { day: 3, book: 'Psalms', chapter: 34, startVerse: 1, endVerse: 22, title: 'I Will Bless the Lord' },
    { day: 4, book: 'Psalms', chapter: 46, startVerse: 1, endVerse: 11, title: 'God is Our Refuge' },
    { day: 5, book: 'Psalms', chapter: 91, startVerse: 1, endVerse: 16, title: 'Under His Wings' },
    { day: 6, book: 'Psalms', chapter: 103, startVerse: 1, endVerse: 22, title: 'Forget Not His Benefits' },
    { day: 7, book: 'Psalms', chapter: 121, startVerse: 1, endVerse: 8, title: 'My Help Comes from the Lord' },
    { day: 8, book: 'Psalms', chapter: 139, startVerse: 1, endVerse: 24, title: 'You Have Searched Me' },
    { day: 9, book: 'Psalms', chapter: 37, startVerse: 1, endVerse: 11, title: 'Do Not Fret' },
    { day: 10, book: 'Psalms', chapter: 42, startVerse: 1, endVerse: 11, title: 'Hope in God' },
    { day: 11, book: 'Psalms', chapter: 55, startVerse: 16, endVerse: 23, title: 'Cast Your Burden on the Lord' },
    { day: 12, book: 'Psalms', chapter: 62, startVerse: 1, endVerse: 12, title: 'My Soul Waits for God' },
    { day: 13, book: 'Psalms', chapter: 116, startVerse: 1, endVerse: 19, title: 'I Love the Lord' },
    { day: 14, book: 'Psalms', chapter: 138, startVerse: 1, endVerse: 8, title: 'The Lord Will Perfect' },
  ];
}

// Reading Plans Data
const READING_PLANS_DATA = [
  {
    id: 'bible-in-year',
    name: 'Bible in a Year',
    icon: '📖',
    duration: 365,
    description: 'Read through the entire Bible in one year with 3-4 chapters per day.',
    category: 'Comprehensive',
    isPro: false,
    readings: generateBibleInYearReadings()
  },
  {
    id: 'psalms-proverbs',
    name: 'Psalms & Proverbs',
    icon: '📜',
    duration: 31,
    description: 'One chapter from Psalms and Proverbs each day for a month.',
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
    isPro: true,
    readings: generateNT90Readings()
  },
  {
    id: 'jesus-miracles',
    name: 'Jesus\' Miracles',
    icon: '✨',
    duration: 21,
    description: 'A thematic 21-day study of all recorded miracles of Jesus.',
    category: 'Thematic',
    isPro: true,
    readings: generateMiraclesReadings()
  },
  {
    id: 'chronological',
    name: 'Chronological Bible',
    icon: '⏳',
    duration: 365,
    description: 'Read the Bible in chronological order of events.',
    category: 'Historical',
    isPro: true,
    readings: generateBibleInYearReadings() // Uses same chapter distribution
  },
  {
    id: 'sermon-on-mount',
    name: 'Sermon on the Mount',
    icon: '🏔️',
    duration: 7,
    description: 'An intensive 7-day meditation on Matthew 5-7.',
    category: 'Thematic',
    isPro: true,
    readings: generateSermonReadings()
  },
  {
    id: 'fruit-of-spirit',
    name: 'Fruit of the Spirit',
    icon: '🍇',
    duration: 10,
    description: 'A 10-day study on the nine fruits of the Spirit and how to cultivate them.',
    category: 'Thematic',
    isPro: true,
    readings: generateFruitOfSpiritReadings()
  },
  {
    id: 'proverbs-month',
    name: '31 Days of Proverbs',
    icon: '📚',
    duration: 31,
    description: 'One chapter of Proverbs each day for a month of godly wisdom.',
    category: 'Wisdom',
    isPro: true,
    readings: generateProverbs31Readings()
  },
  {
    id: 'gospel-john',
    name: 'Gospel of John in 21 Days',
    icon: '🕊️',
    duration: 21,
    description: 'Journey through the Gospel of John, discovering Jesus as the Son of God.',
    category: 'Gospels',
    isPro: true,
    readings: generateGospelOfJohnReadings()
  },
  {
    id: 'armor-of-god',
    name: 'Armor of God',
    icon: '🛡️',
    duration: 7,
    description: 'Learn to stand firm with the full armor of God against spiritual warfare.',
    category: 'Thematic',
    isPro: true,
    readings: generateArmorOfGodReadings()
  },
  {
    id: 'psalms-comfort',
    name: 'Psalms of Comfort',
    icon: '🕯️',
    duration: 14,
    description: 'Find comfort and hope in 14 powerful Psalms for difficult times.',
    category: 'Wisdom',
    isPro: true,
    readings: generatePsalmsOfComfortReadings()
  }
];

// Plan Card Component (same as before)
const PlanCard: React.FC<{
  plan: any;
  activePlan?: any;
  onStart: () => void;
  onView: () => void;
  isPro: boolean;
  theme: any;
  onUpgradeClick: () => void;
}> = ({ plan, activePlan, onStart, onView, isPro, theme, onUpgradeClick }) => {
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
        <div className="text-center p-3 rounded-xl" style={{ backgroundColor: theme.surface }}>
          <Lock size={20} className="mx-auto mb-2" style={{ color: theme.accent }} />
          <p className="text-sm font-medium mb-2" style={{ color: theme.text }}>Pro plan required</p>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onUpgradeClick();
            }}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
            style={{ backgroundColor: theme.accent, color: 'white' }}
          >
            Upgrade to Pro
          </button>
        </div>
      ) : (
        <button
          onClick={activePlan ? onView : onStart}
          className="w-full py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{
            backgroundColor: activePlan ? `${theme.accent}20` : theme.accent,
            color: activePlan ? theme.accent : 'white'
          }}
        >
          {activePlan ? 'Continue →' : 'Start Plan'}
        </button>
      )}
    </div>
  );
};
// PlanDetailView Component - NOW SHOWS ALL VERSES
const PlanDetailView: React.FC<{
  plan: any;
  activePlan: any;
  onBack: () => void;
  onMarkDayComplete: (day: number) => void;
  isPro: boolean;
  theme: any;
  onUpgradeClick: () => void;
}> = ({ plan, activePlan, onBack, onMarkDayComplete, isPro, theme, onUpgradeClick }) => {
  const [selectedDay, setSelectedDay] = useState(activePlan?.currentDay || 1);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
  
  // Get all chapters for the selected day
  const dayReadings = plan.readings.filter((r: any) => r.day === selectedDay);
  const todayReading = dayReadings[selectedChapterIndex] || dayReadings[0];
  
  const isTodayCompleted = activePlan?.completedDays.includes(selectedDay);
  const isLocked = plan.isPro && !isPro;
  const hasMoreChapters = selectedChapterIndex < dayReadings.length - 1;
  const isLastChapter = selectedChapterIndex >= dayReadings.length - 1;
  
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
        <p className="text-sm mb-6" style={{ color: theme.textMuted }}>Upgrade to access this plan.</p>
        <button onClick={onUpgradeClick} className="px-6 py-3 rounded-xl font-semibold" style={{ backgroundColor: theme.accent, color: 'white' }}>
          Upgrade to Pro
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm mb-4" style={{ color: theme.accent }}>
        <ArrowLeft size={16} /> Back to Plans
      </button>
      
      {/* Progress */}
      <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: theme.surface }}>
        <p className="text-3xl font-bold" style={{ color: theme.text }}>{activePlan?.completedDays.length || 0}/{plan.duration}</p>
        <div className="h-2 rounded-full overflow-hidden mt-2" style={{ backgroundColor: theme.border }}>
          <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: theme.accent }} />
        </div>
        <p className="text-xs mt-2" style={{ color: theme.accent }}>{Math.round(progress)}% complete</p>
      </div>
      
      {/* Day Selector */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
        <h3 className="font-bold text-sm mb-3" style={{ color: theme.text }}>Select Day</h3>
        <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto">
          {Array.from({ length: plan.duration }, (_, i) => i + 1).map(day => {
            const isCompleted = activePlan?.completedDays.includes(day);
            const isCurrent = day === selectedDay;
            return (
              <button key={day} onClick={() => { setSelectedDay(day); setSelectedChapterIndex(0); }}
                className="aspect-square flex items-center justify-center rounded-lg text-xs font-medium"
                style={{
                  backgroundColor: isCompleted ? '#4CAF50' : isCurrent ? theme.accent : theme.surface,
                  color: (isCompleted || isCurrent) ? 'white' : theme.text,
                  border: `1px solid ${isCurrent ? theme.accent : theme.border}`,
                }}>
                {day}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Reading Content */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold" style={{ color: theme.text }}>
              Day {selectedDay}: {todayReading?.title || `${todayReading?.book} ${todayReading?.chapter}`}
            </h3>
            
            <p className="text-xs mt-1" style={{ color: theme.accent }}>
              {dayReadings.length > 1 
                ? `Passage ${selectedChapterIndex + 1} of ${dayReadings.length} for today`
                : `${todayReading?.book} ${todayReading?.chapter}${todayReading?.startVerse ? `:${todayReading.startVerse}-${todayReading.endVerse}` : ''}`
              }
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
            {verses.map(verse => (
              <p key={verse.verse} className="text-sm leading-relaxed" style={{ color: theme.text }}>
                <sup className="text-xs mr-1.5" style={{ color: theme.accent }}>{verse.verse}</sup>
                {verse.text}
              </p>
            ))}
          </div>
        )}
        
        {/* Chapter Navigation */}
        {dayReadings.length > 1 && (
          <div className="flex gap-2 mt-4">
            {selectedChapterIndex > 0 && (
              <button onClick={() => setSelectedChapterIndex(prev => prev - 1)}
                className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: theme.surface, color: theme.text }}>
                ← Previous Chapter
              </button>
            )}
            {hasMoreChapters && (
              <button onClick={() => setSelectedChapterIndex(prev => prev + 1)}
                className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: theme.surface, color: theme.text }}>
                Next Chapter →
              </button>
            )}
          </div>
        )}
        
        {/* Mark Complete - Only on last chapter */}
        {!isTodayCompleted && isLastChapter && activePlan && selectedDay === activePlan.currentDay && (
          <button onClick={() => onMarkDayComplete(selectedDay)}
            className="w-full mt-4 py-3 rounded-xl font-semibold text-sm" style={{ backgroundColor: theme.accent, color: 'white' }}>
            Mark Day {selectedDay} Complete ✓
          </button>
        )}
        
        {isTodayCompleted && (
          <div className="flex items-center justify-center gap-2 mt-4 py-2 rounded-xl" style={{ backgroundColor: `${theme.accent}20` }}>
            <CheckCircle size={16} style={{ color: theme.accent }} />
            <span className="text-sm font-medium" style={{ color: theme.accent }}>Day Complete!</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Component (keep the rest as before)
const ReadingPlansScreen: React.FC = () => {
  // ... same as before ...
  const { readerSettings, navigate, isPro, activePlans, markDayComplete, enrollPlan } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showProModal, setShowProModal] = useState(false);
  
  const selectedPlan = selectedPlanId ? READING_PLANS_DATA.find(p => p.id === selectedPlanId) : null;
  const activePlan = selectedPlanId ? activePlans.find(p => p.planId === selectedPlanId) : null;
  
  const handleUpgradeClick = () => {
    setShowProModal(true);
  };
  
  const handleStartPlan = (planId: string) => {
    const plan = READING_PLANS_DATA.find(p => p.id === planId);
    if (plan?.isPro && !isPro) {
      setShowProModal(true);
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
  
  const freePlans = READING_PLANS_DATA.filter(p => !p.isPro);
  const proPlans = READING_PLANS_DATA.filter(p => p.isPro);
  
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
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
                        onUpgradeClick={handleUpgradeClick}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            
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
                    onUpgradeClick={handleUpgradeClick}
                  />
                ))}
              </div>
            </div>
            
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
                    onUpgradeClick={handleUpgradeClick}
                  />
                ))}
              </div>
            </div>
            
            {!isPro && (
              <div className="mt-6 rounded-2xl p-4 cursor-pointer" style={{ background: `linear-gradient(135deg, ${theme.accent}22, ${theme.accent}08)`, border: `1px solid ${theme.accent}33` }}>
                <div className="flex items-center gap-3">
                  <Crown size={24} style={{ color: theme.accent }} />
                  <div className="flex-1">
                    <h3 className="font-bold text-sm" style={{ color: theme.text }}>Unlock All Plans</h3>
                    <p className="text-xs" style={{ color: theme.textMuted }}>Get access to 50+ reading plans with Synthesis Pro</p>
                  </div>
                  <button
                    onClick={handleUpgradeClick}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
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
            onUpgradeClick={handleUpgradeClick}
          />
        )}
        <div className="h-20" />
      </div>
      
      {/* Pro Upgrade Modal */}
      <ProUpgradeModal
        isOpen={showProModal}
        onClose={() => setShowProModal(false)}
        userEmail={useAppStore.getState().currentUser?.email || ''}
        userId={useAppStore.getState().currentUser?.uid || ''}
        onSuccess={() => {
          setShowProModal(false);
          // Refresh the page to update pro status
          window.location.reload();
        }}
        themeMode={readerSettings.theme}
      />
    </div>
  );
};

export default ReadingPlansScreen;