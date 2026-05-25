/**
 * Logos Daily — Groups Screen
 * ==============================
 * Community features including:
 * - Create new study groups
 * - Join existing groups with code
 * - Browse public groups
 * - Group details and member management
 * - Shared reading plans
 * - Persisted groups in localStorage
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Users, Plus, Search, UserPlus, Settings,
  Crown, Calendar, BookOpen, MessageCircle, Bell,
  X, Check, Copy, Link, Shield, Globe, Lock,
  ChevronRight, Mail, Phone, MapPin, Award
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { getTheme } from '../utils/themeUtils';
import { auth } from '../config/firebase';

// Types
interface GroupMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member';
  joinedAt: string;
  avatar?: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  icon: string;
  memberCount: number;
  isPrivate: boolean;
  joinCode: string;
  sharedPlanId?: string;
  sharedPlanName?: string;
  members: GroupMember[];
  createdBy: string;
  createdAt: string;
  userRole?: 'admin' | 'member';
}

interface CreateGroupData {
  name: string;
  description: string;
  isPrivate: boolean;
  sharedPlanId?: string;
}

// Default groups data
const DEFAULT_GROUPS: Group[] = [
  {
    id: 'g1',
    name: 'Morning Grace Community',
    description: 'A small group for daily morning devotionals',
    icon: '🌅',
    memberCount: 14,
    isPrivate: true,
    joinCode: 'MGC-4729',
    sharedPlanId: 'bible-in-year',
    sharedPlanName: 'Bible in a Year',
    members: [],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'g2',
    name: 'Youth Bible Study',
    description: 'Weekly deep dives into Scripture',
    icon: '🔥',
    memberCount: 8,
    isPrivate: true,
    joinCode: 'YBS-8821',
    sharedPlanId: 'nt-90-days',
    sharedPlanName: 'New Testament in 90 Days',
    members: [],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
  },
];

const PUBLIC_GROUPS: Group[] = [
  {
    id: 'p1',
    name: 'Women of Faith',
    description: 'Encouraging and supporting women in their spiritual journey',
    icon: '🌸',
    memberCount: 156,
    isPrivate: false,
    joinCode: 'WOF-1234',
    members: [],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p2',
    name: 'Men\'s Fellowship',
    description: 'Brothers in Christ growing together',
    icon: '💪',
    memberCount: 89,
    isPrivate: false,
    joinCode: 'MF-5678',
    members: [],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p3',
    name: 'Bible Scholars',
    description: 'Deep theological discussions and verse-by-verse study',
    icon: '📚',
    memberCount: 234,
    isPrivate: false,
    joinCode: 'BS-9012',
    members: [],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p4',
    name: 'Prayer Warriors',
    description: '24/7 prayer chain and intercessory group',
    icon: '🙏',
    memberCount: 312,
    isPrivate: false,
    joinCode: 'PW-3456',
    members: [],
    createdBy: 'system',
    createdAt: new Date().toISOString(),
  },
];

// Create Group Modal
const CreateGroupModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (group: Group) => void;
  theme: any;
}> = ({ isOpen, onClose, onCreate, theme }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsLoading(true);
    
    // Create new group object
    const newGroup: Group = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description.trim() || 'No description provided',
      icon: getRandomIcon(),
      memberCount: 1,
      isPrivate: isPrivate,
      joinCode: generateJoinCode(name),
      members: [],
      createdBy: auth.currentUser?.uid || 'current-user',
      createdAt: new Date().toISOString(),
      userRole: 'admin',
    };
    
    onCreate(newGroup);
    setIsLoading(false);
    setName('');
    setDescription('');
    onClose();
  };
  
  const getRandomIcon = () => {
    const icons = ['✨', '⭐', '🌟', '💫', '⚡', '🔥', '💎', '🎯', '💪', '🤝', '📖', '🙏', '❤️', '💙', '💚', '💛', '🧡', '💜'];
    return icons[Math.floor(Math.random() * icons.length)];
  };
  
  const generateJoinCode = (groupName: string) => {
    const prefix = groupName.slice(0, 3).toUpperCase();
    const numbers = Math.floor(Math.random() * 9000 + 1000);
    return `${prefix}-${numbers}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.border }}>
          <h2 className="text-lg font-bold" style={{ color: theme.text }}>Create New Group</h2>
          <button onClick={onClose} style={{ color: theme.textMuted }}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: theme.textMuted }}>Group Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
              placeholder="e.g., Tuesday Bible Study"
              required
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: theme.textMuted }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
              style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
              placeholder="Describe your group's purpose..."
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: theme.textMuted }}>Privacy</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium transition-all ${
                  isPrivate ? 'text-white' : ''
                }`}
                style={{
                  backgroundColor: isPrivate ? theme.accent : theme.surface,
                  color: isPrivate ? 'white' : theme.textMuted,
                  border: `1px solid ${isPrivate ? 'transparent' : theme.border}`,
                }}
              >
                <Lock size={14} /> Private
              </button>
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl text-sm font-medium transition-all ${
                  !isPrivate ? 'text-white' : ''
                }`}
                style={{
                  backgroundColor: !isPrivate ? theme.accent : theme.surface,
                  color: !isPrivate ? 'white' : theme.textMuted,
                  border: `1px solid ${!isPrivate ? 'transparent' : theme.border}`,
                }}
              >
                <Globe size={14} /> Public
              </button>
            </div>
          </div>
          
          <div className="text-xs" style={{ color: theme.textFaint }}>
            {isPrivate ? (
              <p>🔒 Private groups require a join code to access</p>
            ) : (
              <p>🌍 Public groups can be discovered and joined by anyone</p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: theme.accent, color: 'white' }}
          >
            {isLoading ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Join Group Modal
const JoinGroupModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onJoin: (code: string) => void;
  theme: any;
}> = ({ isOpen, onClose, onJoin, theme }) => {
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    setIsLoading(true);
    await onJoin(joinCode.trim().toUpperCase());
    setIsLoading(false);
    setJoinCode('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.border }}>
          <h2 className="text-lg font-bold" style={{ color: theme.text }}>Join a Group</h2>
          <button onClick={onClose} style={{ color: theme.textMuted }}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: theme.textMuted }}>Join Code</label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none uppercase"
              style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
              placeholder="e.g., ABC-1234"
              required
              autoFocus
            />
            <p className="text-xs mt-1" style={{ color: theme.textFaint }}>
              Enter the 8-character code provided by the group admin
            </p>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: theme.accent, color: 'white' }}
          >
            {isLoading ? 'Joining...' : 'Join Group'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Browse Groups Modal
const BrowseGroupsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onJoinGroup: (group: Group) => void;
  theme: any;
}> = ({ isOpen, onClose, onJoinGroup, theme }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredGroups = PUBLIC_GROUPS.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          group.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden max-h-[80vh] flex flex-col"
        style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.border }}>
          <h2 className="text-lg font-bold" style={{ color: theme.text }}>Discover Groups</h2>
          <button onClick={onClose} style={{ color: theme.textMuted }}><X size={20} /></button>
        </div>
        
        <div className="p-4 border-b" style={{ borderColor: theme.border }}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
              style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
              placeholder="Search groups..."
              autoFocus
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredGroups.length > 0 ? (
            filteredGroups.map(group => (
              <div
                key={group.id}
                className="rounded-xl p-4"
                style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{group.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm" style={{ color: theme.text }}>{group.name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{group.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs" style={{ color: theme.textFaint }}>👥 {group.memberCount} members</span>
                      <span className="text-xs" style={{ color: theme.textFaint }}>🌍 Public</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onJoinGroup(group)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                    style={{ backgroundColor: theme.accent, color: 'white' }}
                  >
                    Join
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Search size={32} className="mx-auto mb-2" style={{ color: theme.textMuted }} />
              <p className="text-sm" style={{ color: theme.textMuted }}>No groups found</p>
              <p className="text-xs mt-1" style={{ color: theme.textFaint }}>Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Group Detail Modal
const GroupDetailModal: React.FC<{
  group: Group | null;
  onClose: () => void;
  onLeave: (groupId: string) => void;
  theme: any;
}> = ({ group, onClose, onLeave, theme }) => {
  const [copied, setCopied] = useState(false);
  
  if (!group) return null;
  
  const copyJoinCode = () => {
    navigator.clipboard.writeText(group.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden max-h-[80vh] flex flex-col"
        style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: theme.border }}>
          <h2 className="text-lg font-bold" style={{ color: theme.text }}>{group.name}</h2>
          <button onClick={onClose} style={{ color: theme.textMuted }}><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{group.icon}</div>
            <div>
              <p className="text-sm" style={{ color: theme.textMuted }}>{group.description}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: theme.surface }}>
            <div className="flex items-center gap-2">
              {group.isPrivate ? <Lock size={14} style={{ color: theme.accent }} /> : <Globe size={14} style={{ color: theme.accent }} />}
              <span className="text-sm">{group.isPrivate ? 'Private Group' : 'Public Group'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={14} style={{ color: theme.accent }} />
              <span className="text-sm">{group.memberCount} members</span>
            </div>
          </div>
          
          {group.userRole === 'admin' && (
            <div className="p-3 rounded-xl" style={{ backgroundColor: `${theme.accent}15` }}>
              <div className="flex items-center gap-2 mb-2">
                <Crown size={14} style={{ color: theme.accent }} />
                <span className="text-sm font-medium" style={{ color: theme.accent }}>Admin Tools</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: theme.textMuted }}>Join Code</p>
                  <p className="font-mono text-sm font-bold" style={{ color: theme.text }}>{group.joinCode}</p>
                </div>
                <button
                  onClick={copyJoinCode}
                  className="p-2 rounded-lg transition-all hover:opacity-80"
                  style={{ backgroundColor: theme.surface }}
                >
                  {copied ? <Check size={14} style={{ color: '#4CAF50' }} /> : <Copy size={14} style={{ color: theme.accent }} />}
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: theme.textFaint }}>
                Share this code with people you want to invite
              </p>
            </div>
          )}
          
          {group.sharedPlanName && (
            <div className="p-3 rounded-xl" style={{ backgroundColor: theme.surface }}>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen size={14} style={{ color: theme.accent }} />
                <span className="text-sm font-medium" style={{ color: theme.text }}>Shared Reading Plan</span>
              </div>
              <p className="text-sm" style={{ color: theme.accent }}>{group.sharedPlanName}</p>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t" style={{ borderColor: theme.border }}>
          <button
            onClick={() => onLeave(group.id)}
            className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
            style={{ backgroundColor: '#e53935', color: 'white' }}
          >
            Leave Group
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Component
const GroupsScreen: React.FC = () => {
  const { readerSettings, navigate } = useAppStore();
  const theme = getTheme(readerSettings.theme);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showGroupDetail, setShowGroupDetail] = useState(false);
  
  // Load groups from localStorage on mount
  useEffect(() => {
    loadGroups();
  }, []);
  
  // Save groups to localStorage whenever they change
  useEffect(() => {
    if (groups.length > 0) {
      localStorage.setItem('logos_daily_groups', JSON.stringify(groups));
    }
  }, [groups]);
  
  const loadGroups = () => {
    const savedGroups = localStorage.getItem('logos_daily_groups');
    if (savedGroups) {
      setGroups(JSON.parse(savedGroups));
    } else {
      // Load default groups
      setGroups(DEFAULT_GROUPS);
      localStorage.setItem('logos_daily_groups', JSON.stringify(DEFAULT_GROUPS));
    }
  };
  
  const handleCreateGroup = (newGroup: Group) => {
    setGroups(prevGroups => [newGroup, ...prevGroups]);
    // Show success message
    const toast = document.createElement('div');
    toast.textContent = `✅ Group "${newGroup.name}" created successfully!`;
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: #4CAF50; color: white; padding: 10px 20px;
      border-radius: 10px; z-index: 1000; font-size: 14px;
      animation: fadeInUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };
  
  const handleJoinGroup = async (code: string) => {
    // Check in default groups
    const allGroups = [...DEFAULT_GROUPS, ...PUBLIC_GROUPS];
    const foundGroup = allGroups.find(g => g.joinCode === code);
    
    if (foundGroup) {
      // Check if already a member
      if (groups.find(g => g.id === foundGroup.id)) {
        alert('You are already a member of this group');
        return;
      }
      
      const groupToJoin: Group = {
        ...foundGroup,
        userRole: 'member',
        memberCount: foundGroup.memberCount + 1,
      };
      
      setGroups(prevGroups => [groupToJoin, ...prevGroups]);
      alert(`✅ Successfully joined "${foundGroup.name}"!`);
    } else {
      // Check if it's a user-created group (by join code)
      const userGroups = groups.filter(g => g.userRole === 'admin');
      const foundUserGroup = userGroups.find(g => g.joinCode === code);
      
      if (foundUserGroup) {
        alert('This is your own group! You are already a member.');
      } else {
        alert('❌ Invalid join code. Please check and try again.');
      }
    }
  };
  
  const handleJoinPublicGroup = (group: Group) => {
    // Check if already a member
    if (groups.find(g => g.id === group.id)) {
      alert('You are already a member of this group');
      setShowBrowseModal(false);
      return;
    }
    
    const groupToJoin: Group = {
      ...group,
      userRole: 'member',
      memberCount: group.memberCount + 1,
    };
    
    setGroups(prevGroups => [groupToJoin, ...prevGroups]);
    setShowBrowseModal(false);
    alert(`✅ Successfully joined "${group.name}"!`);
  };
  
  const handleLeaveGroup = (groupId: string) => {
    const groupToLeave = groups.find(g => g.id === groupId);
    if (groupToLeave && confirm(`Are you sure you want to leave "${groupToLeave.name}"?`)) {
      setGroups(groups.filter(g => g.id !== groupId));
      setShowGroupDetail(false);
      setSelectedGroup(null);
      alert(`Left "${groupToLeave.name}"`);
    }
  };
  
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.bg }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('home')} style={{ color: theme.textMuted }}>
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold" style={{ color: theme.text, fontFamily: 'Crimson Pro, serif' }}>
              My Groups
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowJoinModal(true)}
              className="p-2 rounded-xl transition-all hover:opacity-80"
              style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}
              aria-label="Join group"
            >
              <UserPlus size={18} style={{ color: theme.textMuted }} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 rounded-xl transition-all hover:opacity-80"
              style={{ backgroundColor: theme.accent }}
              aria-label="Create group"
            >
              <Plus size={18} style={{ color: 'white' }} />
            </button>
          </div>
        </div>
        <p className="text-xs" style={{ color: theme.textMuted }}>
          {groups.length} {groups.length === 1 ? 'group' : 'groups'}
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users size={48} style={{ color: theme.textMuted }} />
            <h3 className="text-lg font-bold mt-4 mb-2" style={{ color: theme.text }}>No Groups Yet</h3>
            <p className="text-sm mb-6" style={{ color: theme.textMuted }}>
              Create a group or join an existing one to get started
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: theme.accent, color: 'white' }}
              >
                Create Group
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: theme.surface, color: theme.text, border: `1px solid ${theme.border}` }}
              >
                Join with Code
              </button>
            </div>
          </div>
        ) : (
          groups.map(group => (
            <button
              key={group.id}
              onClick={() => {
                setSelectedGroup(group);
                setShowGroupDetail(true);
              }}
              className="w-full rounded-2xl p-4 text-left transition-all active:scale-[0.99]"
              style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{group.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold" style={{ color: theme.text }}>{group.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      group.userRole === 'admin' 
                        ? 'bg-amber-500/20 text-amber-500' 
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {group.userRole === 'admin' ? 'admin' : 'member'}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: theme.textMuted }}>{group.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <Users size={12} style={{ color: theme.textFaint }} />
                      <span className="text-xs" style={{ color: theme.textFaint }}>{group.memberCount} members</span>
                    </div>
                    {group.sharedPlanName && (
                      <div className="flex items-center gap-1">
                        <BookOpen size={12} style={{ color: theme.textFaint }} />
                        <span className="text-xs" style={{ color: theme.textFaint }}>{group.sharedPlanName}</span>
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: theme.textFaint }} />
              </div>
            </button>
          ))
        )}
        
        {/* Discover Section */}
        <div className="mt-6 pt-4 border-t" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.textMuted }}>
              ✦ Discover
            </h2>
            <button
              onClick={() => setShowBrowseModal(true)}
              className="text-xs font-medium flex items-center gap-1 hover:opacity-80"
              style={{ color: theme.accent }}
            >
              Browse All <ChevronRight size={12} />
            </button>
          </div>
          <button
            onClick={() => setShowBrowseModal(true)}
            className="w-full rounded-2xl p-4 text-left transition-all active:scale-[0.99]"
            style={{ backgroundColor: theme.card, border: `1px solid ${theme.border}` }}
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">🌍</div>
              <div className="flex-1">
                <h3 className="font-bold" style={{ color: theme.text }}>Browse Public Groups</h3>
                <p className="text-xs" style={{ color: theme.textMuted }}>Find communities for your study interests</p>
              </div>
              <ChevronRight size={16} style={{ color: theme.textFaint }} />
            </div>
          </button>
        </div>
      </div>
      
      {/* Modals */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateGroup}
        theme={theme}
      />
      
      <JoinGroupModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onJoin={handleJoinGroup}
        theme={theme}
      />
      
      <BrowseGroupsModal
        isOpen={showBrowseModal}
        onClose={() => setShowBrowseModal(false)}
        onJoinGroup={handleJoinPublicGroup}
        theme={theme}
      />
      
      <GroupDetailModal
        group={selectedGroup}
        onClose={() => {
          setShowGroupDetail(false);
          setSelectedGroup(null);
        }}
        onLeave={handleLeaveGroup}
        theme={theme}
      />
    </div>
  );
};

export default GroupsScreen;