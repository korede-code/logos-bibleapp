/**
 * Logos Daily — Progress Dashboard
 * ==================================
 * Visual reading progress with:
 * - Streak visualization
 * - Reading sessions chart
 * - Bible coverage heatmap
 * - Achievement milestones
 * - Stats summary
 */

import React, { useMemo } from 'react';
import { ArrowLeft, Flame, Award, BookOpen, Clock, Star } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid
} from 'recharts';
import { useAppStore } from '../store/appStore';
import { getTheme } from '../utils/themeUtils';
import { format, subDays } from 'date-fns';

const ProgressScreen: React.FC = () => {
  const { readerSettings, navigate, streak, readingSessions, highlights, notes, bookmarks, activePlans } = useAppStore();
  const theme = getTheme(readerSettings.theme);

  // Build last 7 days of sessions for chart
  const sessionData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const session = readingSessions.find(s => s.date === dateStr);
      return {
        day: format(date, 'EEE'),
        minutes: session?.durationMinutes ?? 0,
        chapters: session?.chaptersRead ?? 0,
        date: dateStr,
      };
    });
  }, [readingSessions]);

  const totalMinutes = readingSessions.reduce((a, b) => a + b.durationMinutes, 0);
  const totalChapters = readingSessions.reduce((a, b) => a + b.chaptersRead, 0);
  const avgMinutesPerDay = readingSessions.length > 0
    ? Math.round(totalMinutes / readingSessions.length)
    : 0;

  const achievements = [
    { id: 'first-read', icon: '📖', title: 'First Steps', desc: 'Completed your first reading session', earned: true, date: 'Jan 1' },
    { id: 'week-streak', icon: '🔥', title: 'Week Warrior', desc: 'Read 7 days in a row', earned: streak.longest >= 7, date: 'Jan 7' },
    { id: 'month-streak', icon: '⭐', title: 'Monthly Devotion', desc: 'Read 30 days in a row', earned: streak.longest >= 30, date: null },
    { id: '10-highlights', icon: '✨', title: 'Scripture Marker', desc: 'Added 10 highlights', earned: highlights.length >= 10, date: null },
    { id: '5-notes', icon: '📝', title: 'Deep Thinker', desc: 'Created 5 study notes', earned: notes.length >= 5, date: null },
    { id: 'nt-complete', icon: '✝️', title: 'NT Journey', desc: 'Read through the New Testament', earned: false, date: null },
    { id: '100-chapters', icon: '🏆', title: 'Century Reader', desc: 'Read 100 chapters', earned: totalChapters >= 100, date: null },
    { id: 'plan-complete', icon: '🎯', title: 'Plan Finisher', desc: 'Completed a reading plan', earned: false, date: null },
  ];

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="px-3 py-2 rounded-xl text-xs font-medium shadow-lg"
          style={{ backgroundColor: theme.navBg, border: `1px solid ${theme.border}`, color: theme.text }}
        >
          <p className="font-bold mb-1">{label}</p>
          <p>{payload[0]?.value} min</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('home')} style={{ color: theme.textMuted }} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif' }}>
            My Progress
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

        {/* ─── Streak Cards ─── */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-2xl p-4 text-center"
            style={{ background: 'linear-gradient(135deg, #FF6B35, #FF8C00)', boxShadow: '0 4px 20px rgba(255,107,53,0.3)' }}
            aria-label={`Current streak: ${streak.current} days`}
          >
            <Flame size={24} className="text-white mx-auto mb-2" />
            <p className="text-3xl font-bold text-white">{streak.current}</p>
            <p className="text-xs text-white/80 font-medium">Current Streak</p>
          </div>
          <div
            className="rounded-2xl p-4 text-center"
            style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
            aria-label={`Longest streak: ${streak.longest} days`}
          >
            <Award size={24} className="mx-auto mb-2" style={{ color: theme.accent }} />
            <p className="text-3xl font-bold" style={{ color: theme.text }}>{streak.longest}</p>
            <p className="text-xs font-medium" style={{ color: theme.textMuted }}>Best Streak</p>
          </div>
        </div>

        {/* ─── Stats Row ─── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Clock size={16} />, value: `${totalMinutes}`, label: 'Minutes Read', unit: 'min' },
            { icon: <BookOpen size={16} />, value: `${totalChapters}`, label: 'Chapters', unit: '' },
            { icon: <Star size={16} />, value: `${streak.totalDaysRead}`, label: 'Days Read', unit: '' },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-2xl p-3 text-center"
              style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
              aria-label={`${stat.label}: ${stat.value}${stat.unit}`}
            >
              <div className="flex justify-center mb-1" style={{ color: theme.accent }}>{stat.icon}</div>
              <p className="text-xl font-bold" style={{ color: theme.text }}>{stat.value}</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ─── Reading Time Chart ─── */}
        <section aria-label="Reading time chart for past 7 days">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>
            ✦ Reading Time — Last 7 Days
          </h2>
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium" style={{ color: theme.textMuted }}>Minutes per day</span>
              <span className="text-sm font-bold" style={{ color: theme.accent }}>{avgMinutesPerDay} avg/day</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={sessionData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: theme.textFaint, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip content={customTooltip} cursor={{ fill: `${theme.accent}10` }} />
                <Bar
                  dataKey="minutes"
                  fill={theme.accent}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ─── Chapters Read Chart ─── */}
        <section aria-label="Chapters read trend chart">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>
            ✦ Chapters Read — Trend
          </h2>
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
          >
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={sessionData}>
                <defs>
                  <linearGradient id="chapterGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={theme.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: theme.textFaint, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={customTooltip} />
                <Area
                  type="monotone"
                  dataKey="chapters"
                  stroke={theme.accent}
                  strokeWidth={2}
                  fill="url(#chapterGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ─── Active Plans ─── */}
        {activePlans.length > 0 && (
          <section aria-label="Reading plan progress">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>
              ✦ Plans Progress
            </h2>
            <div className="space-y-3">
              {activePlans.map(plan => {
                const planInfo = { 'bible-in-year': { name: 'Bible in a Year', duration: 365 }, 'psalms-proverbs': { name: 'Psalms & Proverbs', duration: 31 }, 'nt-90-days': { name: 'NT in 90 Days', duration: 90 } }[plan.planId] ?? { name: plan.planId, duration: 365 };
                const pct = Math.round((plan.completedDays.length / planInfo.duration) * 100);
                return (
                  <div
                    key={plan.planId}
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
                    aria-label={`${planInfo.name}: ${pct}% complete`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-sm" style={{ color: theme.text }}>{planInfo.name}</p>
                      <span className="text-sm font-bold" style={{ color: theme.accent }}>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: theme.border }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: theme.accent }} />
                    </div>
                    <p className="text-xs mt-1" style={{ color: theme.textFaint }}>
                      Day {plan.currentDay} of {planInfo.duration}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── Achievements ─── */}
        <section aria-label="Achievements">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>
            ✦ Achievements
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {achievements.map(a => (
              <div
                key={a.id}
                className="rounded-2xl p-4 flex flex-col items-center text-center gap-2"
                style={{
                  backgroundColor: a.earned ? `${theme.accent}12` : theme.surface,
                  border: `1px solid ${a.earned ? theme.accent + '40' : theme.border}`,
                  opacity: a.earned ? 1 : 0.5,
                }}
                aria-label={`${a.title}: ${a.desc}${a.earned ? ' (earned)' : ' (locked)'}`}
              >
                <span className="text-2xl" style={{ filter: a.earned ? 'none' : 'grayscale(1)' }}>{a.icon}</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: a.earned ? theme.text : theme.textMuted }}>{a.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: theme.textFaint, lineHeight: 1.3 }}>{a.desc}</p>
                </div>
                {a.earned && a.date && (
                  <span className="text-xs font-medium" style={{ color: theme.accent }}>{a.date}</span>
                )}
                {!a.earned && (
                  <span className="text-xs" style={{ color: theme.textFaint }}>🔒 Locked</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ─── Annotation Stats ─── */}
        <section aria-label="Study statistics">
          <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: theme.textMuted }}>
            ✦ Study Stats
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: highlights.length, label: 'Highlights', icon: '⭐' },
              { value: notes.length, label: 'Notes', icon: '📝' },
              { value: bookmarks.length, label: 'Bookmarks', icon: '🔖' },
            ].map(s => (
              <div
                key={s.label}
                className="rounded-2xl p-3 text-center"
                style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
                aria-label={`${s.label}: ${s.value}`}
              >
                <span className="text-xl">{s.icon}</span>
                <p className="text-xl font-bold mt-1" style={{ color: theme.text }}>{s.value}</p>
                <p className="text-xs" style={{ color: theme.textMuted }}>{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="h-20" />
      </div>
    </div>
  );
};

export default ProgressScreen;
