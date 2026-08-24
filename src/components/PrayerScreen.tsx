// src/components/PrayerScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Search, X, Filter, 
  ChevronRight, CheckCircle, Circle, Clock,
  Tag, Trash2, Edit2, Save, Calendar
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getTheme } from '../utils/themeUtils';

const PrayerScreen: React.FC = () => {
  const { readerSettings, prayers, addPrayer, updatePrayer, deletePrayer, navigate } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'praying' | 'answered' | 'archived'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAddPrayer, setShowAddPrayer] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState<string | null>(null);
  
  // New prayer form state
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newStatus, setNewStatus] = useState<'praying' | 'answered' | 'archived'>('praying');

  // Get all unique tags from prayers
  const allTags = Array.from(new Set(prayers.flatMap(p => p.tags || [])));

  // Filter prayers
  const filteredPrayers = prayers.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.body.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesTags = selectedTags.length === 0 || (p.tags && selectedTags.some(t => p.tags?.includes(t)));
    return matchesSearch && matchesStatus && matchesTags;
  });

  // Group prayers by status for display
  const prayingPrayers = filteredPrayers.filter(p => p.status === 'praying');
  const answeredPrayers = filteredPrayers.filter(p => p.status === 'answered');
  const archivedPrayers = filteredPrayers.filter(p => p.status === 'archived');

  const handleAddPrayer = () => {
    if (!newTitle.trim()) return;
    
    const tagsArray = newTags.split(',').map(t => t.trim()).filter(t => t);
    
    addPrayer({
      title: newTitle.trim(),
      body: newBody.trim(),
      status: newStatus,
      tags: tagsArray,
    });
    
    // Reset form
    setNewTitle('');
    setNewBody('');
    setNewTags('');
    setNewStatus('praying');
    setShowAddPrayer(false);
  };

  const handleUpdatePrayer = (id: string, updates: any) => {
    updatePrayer(id, updates);
    setEditingPrayer(null);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'answered': return <CheckCircle size={16} className="text-green-500" />;
      case 'archived': return <Clock size={16} className="text-gray-500" />;
      default: return <Circle size={16} className="text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'answered': return '#22C55E';
      case 'archived': return '#6B7280';
      default: return '#3B82F6';
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('home')} style={{ color: theme.textMuted }}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif' }}>
            Prayer Journal
          </h1>
          <span className="text-xs font-medium ml-auto px-2 py-1 rounded-full" style={{ backgroundColor: theme.surface, color: theme.textMuted }}>
            {filteredPrayers.length}
          </span>
          <button
            onClick={() => setShowAddPrayer(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ backgroundColor: theme.accent, color: 'white' }}
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
          <Search size={16} style={{ color: theme.textMuted }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prayers..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: theme.text }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ color: theme.textMuted }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* ✅ Fixed: Status Filter - Responsive with scrollable container */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          {['all', 'praying', 'answered', 'archived'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap flex-shrink-0"
              style={{
                backgroundColor: filterStatus === status ? theme.accent : theme.surface,
                color: filterStatus === status ? 'white' : theme.textMuted,
                border: `1px solid ${filterStatus === status ? theme.accent : theme.border}`,
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* ✅ Fixed: Tags Filter - Responsive with better wrapping on small screens */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="text-[10px] px-2 py-1 rounded-full font-medium transition-all flex-shrink-0"
                style={{
                  backgroundColor: selectedTags.includes(tag) ? theme.accent : theme.surface,
                  color: selectedTags.includes(tag) ? 'white' : theme.textMuted,
                  border: `1px solid ${selectedTags.includes(tag) ? theme.accent : theme.border}`,
                }}
              >
                #{tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-[10px] px-2 py-1 rounded-full font-medium transition-all flex-shrink-0"
                style={{
                  backgroundColor: theme.surface,
                  color: theme.textMuted,
                  border: `1px solid ${theme.border}`,
                }}
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Praying Section */}
        {prayingPrayers.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3 px-1" style={{ color: theme.textMuted }}>
              🙏 Praying ({prayingPrayers.length})
            </h2>
            <div className="space-y-3">
              {prayingPrayers.map(prayer => (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  theme={theme}
                  isEditing={editingPrayer === prayer.id}
                  onEdit={() => setEditingPrayer(prayer.id)}
                  onSave={(updates) => handleUpdatePrayer(prayer.id, updates)}
                  onCancel={() => setEditingPrayer(null)}
                  onDelete={() => deletePrayer(prayer.id)}
                  onStatusChange={(status) => handleUpdatePrayer(prayer.id, { status })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Answered Section */}
        {answeredPrayers.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3 px-1" style={{ color: theme.textMuted }}>
              ✅ Answered ({answeredPrayers.length})
            </h2>
            <div className="space-y-3">
              {answeredPrayers.map(prayer => (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  theme={theme}
                  isEditing={editingPrayer === prayer.id}
                  onEdit={() => setEditingPrayer(prayer.id)}
                  onSave={(updates) => handleUpdatePrayer(prayer.id, updates)}
                  onCancel={() => setEditingPrayer(null)}
                  onDelete={() => deletePrayer(prayer.id)}
                  onStatusChange={(status) => handleUpdatePrayer(prayer.id, { status })}
                />
              ))}
            </div>
          </div>
        )}

        {/* Archived Section */}
        {archivedPrayers.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3 px-1" style={{ color: theme.textMuted }}>
              📦 Archived ({archivedPrayers.length})
            </h2>
            <div className="space-y-3">
              {archivedPrayers.map(prayer => (
                <PrayerCard
                  key={prayer.id}
                  prayer={prayer}
                  theme={theme}
                  isEditing={editingPrayer === prayer.id}
                  onEdit={() => setEditingPrayer(prayer.id)}
                  onSave={(updates) => handleUpdatePrayer(prayer.id, updates)}
                  onCancel={() => setEditingPrayer(null)}
                  onDelete={() => deletePrayer(prayer.id)}
                  onStatusChange={(status) => handleUpdatePrayer(prayer.id, { status })}
                />
              ))}
            </div>
          </div>
        )}

        {filteredPrayers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">🙏</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: theme.text }}>
              {searchQuery || selectedTags.length > 0 ? 'No matches found' : 'No prayers yet'}
            </h3>
            <p className="text-sm" style={{ color: theme.textMuted }}>
              {searchQuery || selectedTags.length > 0 
                ? 'Try adjusting your search or filters' 
                : 'Start your prayer journal by adding your first prayer'}
            </p>
            {!searchQuery && selectedTags.length === 0 && (
              <button
                onClick={() => setShowAddPrayer(true)}
                className="mt-4 px-6 py-2.5 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: theme.accent, color: 'white' }}
              >
                Add Prayer
              </button>
            )}
          </div>
        )}
        <div className="h-20" />
      </div>

      {/* Add Prayer Modal */}
      {showAddPrayer && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setShowAddPrayer(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl p-6"
            style={{ backgroundColor: theme.card }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: theme.text }}>New Prayer</h2>
              <button onClick={() => setShowAddPrayer(false)} style={{ color: theme.textMuted }}>
                <X size={20} />
              </button>
            </div>
            
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Prayer title..."
              className="w-full px-4 py-3 rounded-xl mb-3 text-sm outline-none"
              style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
            />
            
            <textarea
              value={newBody}
              onChange={e => setNewBody(e.target.value)}
              placeholder="Write your prayer..."
              className="w-full px-4 py-3 rounded-xl mb-3 text-sm outline-none resize-none"
              rows={4}
              style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
            />
            
            <input
              type="text"
              value={newTags}
              onChange={e => setNewTags(e.target.value)}
              placeholder="Tags (comma separated, e.g., family, healing)"
              className="w-full px-4 py-3 rounded-xl mb-3 text-sm outline-none"
              style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
            />
            
            <select
              value={newStatus}
              onChange={e => setNewStatus(e.target.value as any)}
              className="w-full px-4 py-3 rounded-xl mb-4 text-sm outline-none"
              style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
            >
              <option value="praying">🙏 Praying</option>
              <option value="answered">✅ Answered</option>
              <option value="archived">📦 Archived</option>
            </select>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddPrayer(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddPrayer}
                disabled={!newTitle.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: theme.accent, color: 'white' }}
              >
                Save Prayer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Prayer Card Component ────────────────────────────────────────────────

const PrayerCard: React.FC<{
  prayer: any;
  theme: any;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: any) => void;
  onCancel: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
}> = ({ prayer, theme, isEditing, onEdit, onSave, onCancel, onDelete, onStatusChange }) => {
  const [editTitle, setEditTitle] = useState(prayer.title);
  const [editBody, setEditBody] = useState(prayer.body);
  const [editTags, setEditTags] = useState(prayer.tags?.join(', ') || '');

  const handleSave = () => {
    const tagsArray = editTags.split(',').map(t => t.trim()).filter(t => t);
    onSave({ title: editTitle, body: editBody, tags: tagsArray });
  };

  if (isEditing) {
    return (
      <div className="rounded-xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
        <input
          type="text"
          value={editTitle}
          onChange={e => setEditTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-lg mb-2 text-sm outline-none"
          style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
          placeholder="Title"
        />
        <textarea
          value={editBody}
          onChange={e => setEditBody(e.target.value)}
          className="w-full px-3 py-2 rounded-lg mb-2 text-sm outline-none resize-none"
          rows={3}
          style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
          placeholder="Prayer content"
        />
        <input
          type="text"
          value={editTags}
          onChange={e => setEditTags(e.target.value)}
          className="w-full px-3 py-2 rounded-lg mb-3 text-sm outline-none"
          style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
          placeholder="Tags (comma separated)"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: theme.accent, color: 'white' }}
          >
            <Save size={14} className="inline mr-1" /> Save
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => {
            const statusMap = { 'praying': 'answered', 'answered': 'archived', 'archived': 'praying' };
            onStatusChange(statusMap[prayer.status as keyof typeof statusMap]);
          }}
          className="mt-0.5 flex-shrink-0"
          style={{ color: getStatusColor(prayer.status) }}
        >
          {getStatusIcon(prayer.status)}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold truncate" style={{ color: theme.text }}>
              {prayer.title}
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: theme.surface, color: theme.textMuted }}>
              {prayer.status}
            </span>
          </div>
          
          <p className="text-sm mt-1 leading-relaxed" style={{ color: theme.textMuted }}>
            {prayer.body}
          </p>
          
          {/* ✅ Fixed: Tags - Always visible with wrapping on all screen sizes */}
          {prayer.tags && prayer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {prayer.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: `${theme.accent}20`, color: theme.accent }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
          
          <div className="flex items-center gap-4 mt-2">
            {prayer.answeredAt && (
              <span className="text-[10px]" style={{ color: theme.textFaint }}>
                <Calendar size={10} className="inline mr-1" />
                Answered {new Date(prayer.answeredAt).toLocaleDateString()}
              </span>
            )}
            <span className="text-[10px]" style={{ color: theme.textFaint }}>
              {new Date(prayer.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: theme.textMuted }}
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: theme.textMuted }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

const getStatusIcon = (status: string) => {
  switch(status) {
    case 'answered': return <CheckCircle size={16} className="text-green-500" />;
    case 'archived': return <Clock size={16} className="text-gray-500" />;
    default: return <Circle size={16} className="text-blue-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch(status) {
    case 'answered': return '#22C55E';
    case 'archived': return '#6B7280';
    default: return '#3B82F6';
  }
};

export default PrayerScreen;