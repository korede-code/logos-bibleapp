/**
 * Logos Daily — Prayer Journal Screen
 * =====================================
 * Private prayer journal featuring:
 * - Prayer entry creation and management
 * - Status tracking (praying, answered, archived)
 * - Tagging and search
 * - Answer log with timestamps
 * - Beautiful, respectful UI
 */

import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, Plus, X, Save, CheckCircle, Clock,
  Archive, Heart, Search
} from 'lucide-react';
import { useAppStore, type PrayerEntry } from '../store/appStore';
import { getTheme } from '../utils/themeUtils';
import { format } from 'date-fns';

type PrayerTab = 'active' | 'answered' | 'all';
type PrayerView = 'list' | 'new' | 'view';

const PrayerScreen: React.FC = () => {
  const { readerSettings, navigate, prayers, addPrayer, updatePrayer, deletePrayer } = useAppStore();
  const theme = getTheme(readerSettings.theme);

  const [tab, setTab] = useState<PrayerTab>('active');
  const [view, setView] = useState<PrayerView>('list');
  const [viewingPrayer, setViewingPrayer] = useState<PrayerEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newEntry, setNewEntry] = useState({ title: '', body: '', tags: [] as string[], newTag: '' });

  const filteredPrayers = useMemo(() => {
    let list = prayers;
    if (tab === 'active') list = prayers.filter(p => p.status === 'praying');
    else if (tab === 'answered') list = prayers.filter(p => p.status === 'answered');

    if (searchQuery) {
      list = list.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.body.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [prayers, tab, searchQuery]);

  const counts = {
    active: prayers.filter(p => p.status === 'praying').length,
    answered: prayers.filter(p => p.status === 'answered').length,
    all: prayers.length,
  };

  const handleSave = () => {
    if (!newEntry.title.trim()) return;
    addPrayer({
      title: newEntry.title,
      body: newEntry.body,
      status: 'praying',
      tags: newEntry.tags,
    });
    setNewEntry({ title: '', body: '', tags: [], newTag: '' });
    setView('list');
  };

  const markAnswered = (id: string) => {
    updatePrayer(id, { status: 'answered', answeredAt: Date.now() });
    setViewingPrayer(prev => prev ? { ...prev, status: 'answered', answeredAt: Date.now() } : null);
  };

  const statusConfig = {
    praying: { icon: <Heart size={14} />, label: 'Praying', color: '#CC4488', bg: '#CC448820' },
    answered: { icon: <CheckCircle size={14} />, label: 'Answered', color: '#3D9A3A', bg: '#3D9A3A20' },
    archived: { icon: <Archive size={14} />, label: 'Archived', color: '#888888', bg: '#88888820' },
  };

  // ─── New Prayer Form ───────────────────────────────────────────────────────

  if (view === 'new') {
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
        <div className="flex items-center justify-between px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <button onClick={() => setView('list')} style={{ color: theme.textMuted }} aria-label="Cancel">
            <X size={20} />
          </button>
          <h2 className="font-bold" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif' }}>New Prayer</h2>
          <button
            onClick={handleSave}
            disabled={!newEntry.title.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm disabled:opacity-40"
            style={{ backgroundColor: theme.accent, color: 'white' }}
            aria-label="Save prayer"
          >
            <Save size={14} /> Save
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Verse decoration */}
          <div
            className="rounded-2xl px-4 py-3 text-center"
            style={{ background: `linear-gradient(135deg, ${theme.accent}15, ${theme.accent}05)`, border: `1px solid ${theme.accent}25` }}
          >
            <p className="text-sm font-medium italic" style={{ color: theme.accent, fontFamily: 'Crimson Pro, serif' }}>
              "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God."
            </p>
            <p className="text-xs font-bold mt-1" style={{ color: theme.accent }}>Philippians 4:6</p>
          </div>

          {/* Title */}
          <input
            type="text"
            placeholder="Prayer title..."
            value={newEntry.title}
            onChange={e => setNewEntry(n => ({ ...n, title: e.target.value }))}
            className="w-full text-xl font-bold bg-transparent outline-none"
            style={{
              color: theme.text,
              fontFamily: 'Crimson Pro, serif',
              borderBottom: `2px solid ${theme.border}`,
              paddingBottom: '8px',
            }}
            aria-label="Prayer title"
          />

          {/* Body */}
          <textarea
            placeholder="Share your heart with God... Write your request, concerns, or gratitude."
            value={newEntry.body}
            onChange={e => setNewEntry(n => ({ ...n, body: e.target.value }))}
            className="w-full bg-transparent outline-none resize-none"
            style={{
              color: theme.text,
              fontFamily: `${readerSettings.fontFamily}, serif`,
              fontSize: `${readerSettings.fontSize - 2}px`,
              lineHeight: readerSettings.lineSpacing,
              minHeight: '200px',
            }}
            rows={10}
            aria-label="Prayer details"
          />

          {/* Tags */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider mb-2 block" style={{ color: theme.textMuted }}>Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {newEntry.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}>
                  #{tag}
                  <button onClick={() => setNewEntry(n => ({ ...n, tags: n.tags.filter(t => t !== tag) }))} aria-label={`Remove ${tag}`}>
                    <X size={9} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="family, healing, wisdom..."
                value={newEntry.newTag}
                onChange={e => setNewEntry(n => ({ ...n, newTag: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newEntry.newTag.trim()) {
                    setNewEntry(n => ({ ...n, tags: [...n.tags, n.newTag.trim().toLowerCase()], newTag: '' }));
                  }
                }}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, color: theme.text }}
                aria-label="Add tag"
              />
              <button
                onClick={() => {
                  if (newEntry.newTag.trim()) {
                    setNewEntry(n => ({ ...n, tags: [...n.tags, n.newTag.trim().toLowerCase()], newTag: '' }));
                  }
                }}
                className="px-3 py-2 rounded-xl"
                style={{ backgroundColor: theme.accent, color: 'white' }}
                aria-label="Add tag"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Prayer Detail View ───────────────────────────────────────────────────

  if (view === 'view' && viewingPrayer) {
    const status = statusConfig[viewingPrayer.status];
    return (
      <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
        <div className="flex items-center justify-between px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <button onClick={() => { setView('list'); setViewingPrayer(null); }} style={{ color: theme.textMuted }} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: status.bg, color: status.color }}>
            {status.icon} {status.label}
          </span>
          <button
            onClick={() => { deletePrayer(viewingPrayer.id); setView('list'); setViewingPrayer(null); }}
            className="p-2 rounded-xl"
            style={{ color: '#e53935' }}
            aria-label="Delete prayer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <h1 className="text-2xl font-bold mb-2" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif' }}>
            {viewingPrayer.title}
          </h1>
          <p className="text-xs mb-4 flex items-center gap-2" style={{ color: theme.textFaint }}>
            <Clock size={11} />
            {format(new Date(viewingPrayer.createdAt), 'MMMM d, yyyy')}
            {viewingPrayer.answeredAt && (
              <span className="text-green-500">
                · Answered {format(new Date(viewingPrayer.answeredAt), 'MMMM d')}
              </span>
            )}
          </p>

          <div
            className="leading-relaxed whitespace-pre-wrap mb-6"
            style={{
              color: theme.text,
              fontFamily: `${readerSettings.fontFamily}, serif`,
              fontSize: `${readerSettings.fontSize - 2}px`,
              lineHeight: readerSettings.lineSpacing,
            }}
          >
            {viewingPrayer.body}
          </div>

          {viewingPrayer.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {viewingPrayer.tags.map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${theme.accent}18`, color: theme.accent }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {viewingPrayer.status === 'praying' && (
            <button
              onClick={() => markAnswered(viewingPrayer.id)}
              className="w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
              style={{ backgroundColor: '#3D9A3A', color: 'white' }}
              aria-label="Mark this prayer as answered"
            >
              <CheckCircle size={18} /> Mark as Answered — Praise God!
            </button>
          )}

          {viewingPrayer.status === 'answered' && (
            <div
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ backgroundColor: '#3D9A3A18', border: '1px solid #3D9A3A33' }}
            >
              <CheckCircle size={20} style={{ color: '#3D9A3A' }} />
              <div>
                <p className="font-bold text-sm" style={{ color: '#3D9A3A' }}>Prayer Answered!</p>
                <p className="text-xs" style={{ color: theme.textMuted }}>
                  {viewingPrayer.answeredAt ? format(new Date(viewingPrayer.answeredAt), 'MMMM d, yyyy') : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Prayer List ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('home')} style={{ color: theme.textMuted }} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold flex-1" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif' }}>Prayer Journal</h1>
          <button
            onClick={() => setView('new')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-sm"
            style={{ backgroundColor: theme.accent, color: 'white' }}
            aria-label="Add new prayer"
          >
            <Plus size={16} /> Add
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
          <Search size={15} style={{ color: theme.textMuted }} />
          <input
            type="search"
            placeholder="Search prayers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: theme.text }}
            aria-label="Search prayers"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {([
            { id: 'active' as PrayerTab, label: 'Praying', count: counts.active },
            { id: 'answered' as PrayerTab, label: 'Answered', count: counts.answered },
            { id: 'all' as PrayerTab, label: 'All', count: counts.all },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{
                backgroundColor: tab === t.id ? theme.accent : theme.surface,
                color: tab === t.id ? 'white' : theme.textMuted,
              }}
              aria-pressed={tab === t.id}
              aria-label={`${t.label} prayers (${t.count})`}
            >
              {t.label}
              <span
                className="px-1.5 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: tab === t.id ? 'rgba(255,255,255,0.3)' : theme.border,
                  color: tab === t.id ? 'white' : theme.textMuted,
                }}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Prayer List */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Featured Verse */}
        {tab === 'active' && (
          <div
            className="rounded-2xl px-4 py-3 mb-4 text-center"
            style={{ background: `linear-gradient(135deg, ${theme.accent}12, ${theme.accent}04)`, border: `1px solid ${theme.accent}20` }}
          >
            <p className="text-sm italic" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif' }}>
              "The effectual fervent prayer of a righteous man availeth much."
            </p>
            <p className="text-xs font-bold mt-1" style={{ color: theme.accent }}>James 5:16</p>
          </div>
        )}

        {filteredPrayers.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <span className="text-5xl">🙏</span>
            <div className="text-center">
              <p className="font-bold mb-1" style={{ color: theme.text }}>
                {tab === 'answered' ? 'No answered prayers yet' : 'No prayers yet'}
              </p>
              <p className="text-sm" style={{ color: theme.textMuted }}>
                {tab === 'active' ? 'Start by adding your first prayer request' : 'Mark prayers as answered when God responds'}
              </p>
            </div>
            {tab === 'active' && (
              <button
                onClick={() => setView('new')}
                className="px-5 py-2.5 rounded-xl font-bold text-sm"
                style={{ backgroundColor: theme.accent, color: 'white' }}
              >
                Add First Prayer
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPrayers.map(prayer => {
              const status = statusConfig[prayer.status];
              return (
                <button
                  key={prayer.id}
                  onClick={() => { setViewingPrayer(prayer); setView('view'); }}
                  className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.99]"
                  style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
                  aria-label={`${prayer.title}, ${status.label}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-base flex-1" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif' }}>
                      {prayer.title}
                    </h3>
                    <span
                      className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: status.bg, color: status.color }}
                    >
                      {status.icon} {status.label}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2 mb-2" style={{ color: theme.textMuted, lineHeight: 1.5 }}>
                    {prayer.body}
                  </p>
                  <div className="flex items-center gap-2">
                    <Clock size={10} style={{ color: theme.textFaint }} />
                    <span className="text-xs" style={{ color: theme.textFaint }}>
                      {format(new Date(prayer.createdAt), 'MMM d, yyyy')}
                    </span>
                    {prayer.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.surface, color: theme.textMuted }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div className="h-20" />
      </div>
    </div>
  );
};

export default PrayerScreen;
