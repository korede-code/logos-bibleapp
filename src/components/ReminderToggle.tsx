// src/components/ReminderToggle.tsx
import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, AlertTriangle } from 'lucide-react';
import { usePreferences } from '../contexts/PreferencesContext';
import { useNotifications } from '../hooks/useNotifications';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

interface ReminderToggleProps {
  theme: any;
}

export const ReminderToggle: React.FC<ReminderToggleProps> = ({ theme }) => {
  const { preferences, updatePreference } = useNotificationsWithPreferences();
  const {
    hasPermission,
    needsExactAlarm,
    reminderTime: notificationReminder,
    enableReminder,
    disableReminder,
    requestExactAlarm,
    requestPermission,
    openBatterySettings,
    checkStatus,
    isLoading,
    savePendingReminder
  } = useNotifications();

  // Local state
  const [isEnabled, setIsEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [isSaving, setIsSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [error, setError] = useState('');
  const [pendingSave, setPendingSave] = useState(false);

  // Load preferences from cloud
  useEffect(() => {
    if (preferences) {
      setIsEnabled(preferences.dailyReminder || false);
      setReminderTime(preferences.reminderTime || '09:00');
      
      // Parse time for picker
      if (preferences.reminderTime) {
        const [h, m] = preferences.reminderTime.split(':').map(Number);
        setHour(h || 9);
        setMinute(m || 0);
      }
    }
  }, [preferences]);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const colors = {
      success: '#4CAF50',
      error: '#e53935',
      info: '#f59e0b'
    };
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: ${colors[type]}; color: white; padding: 10px 20px;
      border-radius: 10px; z-index: 9999; font-size: 14px;
      animation: fadeInUp 0.3s ease;
      max-width: 90%;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  // Handle toggle on/off
  const handleToggle = async () => {
    if (isEnabled) {
      // Disable reminder
      setIsSaving(true);
      try {
        await disableReminder();
        await updatePreference('dailyReminder', false);
        setIsEnabled(false);
        showToast('Daily reminder disabled');
      } catch (error) {
        console.error('Failed to disable reminder:', error);
        showToast('Failed to disable reminder', 'error');
      } finally {
        setIsSaving(false);
      }
    } else {
      // Enable reminder - check permissions first
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          setError('Notification permission denied');
          return;
        }
      }
      
      // Check if exact alarm is needed (Android 12+)
      if (needsExactAlarm) {
        setError('Android requires exact alarm permission for on-time reminders');
        await requestExactAlarm();
        return;
      }
      
      setShowTimePicker(true);
      setError('');
    }
  };

  // Save time and enable reminder
  const handleSaveTime = async () => {
    setError('');
    setIsSaving(true);
    try {
      const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      
      // Save pending time in case exact alarm is needed
      savePendingReminder(hour, minute);
      
      // Enable native notification
      await enableReminder(hour, minute);
      
      // Save to cloud preferences
      await updatePreference('dailyReminder', true);
      await updatePreference('reminderTime', timeString);
      
      setIsEnabled(true);
      setReminderTime(timeString);
      setShowTimePicker(false);
      setPendingSave(false);
      
      showToast(`✅ Reminder set for ${timeString}`);
      
    } catch (e: any) {
      if (e.message === 'EXACT_ALARM_PERMISSION_NEEDED') {
        setError('Android requires you to enable exact alarms manually');
        setPendingSave(true);
        // The exact alarm request will happen through the error state
      } else {
        setError(e.message || 'Failed to set reminder');
        showToast('Failed to set reminder', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle time change from input
  const handleTimeChange = async (time: string) => {
    setReminderTime(time);
    const [h, m] = time.split(':').map(Number);
    setHour(h);
    setMinute(m);
    
    if (isEnabled) {
      setIsSaving(true);
      try {
        await disableReminder();
        await enableReminder(h, m);
        await updatePreference('reminderTime', time);
        showToast(`Reminder time updated to ${time}`);
      } catch (error) {
        console.error('Failed to update reminder time:', error);
        showToast('Failed to update reminder time', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: theme.accent }} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isEnabled ? (
            <Bell size={16} style={{ color: theme.accent }} />
          ) : (
            <BellOff size={16} style={{ color: theme.textMuted }} />
          )}
          <div>
            <p className="font-medium text-sm" style={{ color: theme.text }}>
              Daily Reminder
            </p>
            <p className="text-xs" style={{ color: theme.textMuted }}>
              {isEnabled 
                ? `Reminds you at ${reminderTime} daily` 
                : 'Get daily Bible reading reminders'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={isSaving}
          className={`w-12 h-7 rounded-full transition-all ${
            isEnabled ? 'bg-blue-500' : 'bg-gray-500'
          } ${isSaving ? 'opacity-50' : ''}`}
          aria-label={isEnabled ? 'Disable reminder' : 'Enable reminder'}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
            isEnabled ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 p-2 rounded-lg text-xs" style={{ backgroundColor: '#e5393515', color: '#e53935' }}>
          {error}
          {needsExactAlarm && (
            <button 
              onClick={requestExactAlarm} 
              className="ml-2 underline font-semibold"
              style={{ color: theme.accent }}
            >
              Open Settings
            </button>
          )}
        </div>
      )}

      {/* Exact alarm permission warning */}
      {needsExactAlarm && !error && (
        <div className="mt-2 p-2 rounded-lg flex items-start gap-2" style={{ backgroundColor: theme.surface }}>
          <AlertTriangle size={14} color={theme.warning} />
          <div className="text-xs flex-1">
            <p style={{ color: theme.text }}>Enable exact alarms for on-time reminders</p>
            <button 
              onClick={requestExactAlarm} 
              className="underline mt-1 font-semibold" 
              style={{ color: theme.accent }}
            >
              Open Settings
            </button>
          </div>
        </div>
      )}

      {/* Time picker for enabling */}
      {showTimePicker && (
        <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: theme.surface }}>
          <p className="text-sm mb-2 font-medium" style={{ color: theme.text }}>
            Set reminder time:
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="23"
              value={hour}
              onChange={(e) => setHour(Math.min(23, Math.max(0, Number(e.target.value))))}
              className="w-16 p-2 rounded text-center outline-none"
              style={{ 
                backgroundColor: theme.card, 
                color: theme.text, 
                border: `1px solid ${theme.border}` 
              }}
            />
            <span style={{ color: theme.text }}>:</span>
            <input
              type="number"
              min="0"
              max="59"
              value={minute}
              onChange={(e) => setMinute(Math.min(59, Math.max(0, Number(e.target.value))))}
              className="w-16 p-2 rounded text-center outline-none"
              style={{ 
                backgroundColor: theme.card, 
                color: theme.text, 
                border: `1px solid ${theme.border}` 
              }}
            />
            <button
              onClick={handleSaveTime}
              disabled={isSaving}
              className="ml-auto px-3 py-2 rounded text-sm font-medium transition-all hover:opacity-80"
              style={{ 
                backgroundColor: theme.accent, 
                color: 'white',
                opacity: isSaving ? 0.6 : 1
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Time picker for editing (when enabled) */}
      {isEnabled && !showTimePicker && (
        <div className="flex items-center gap-3 pl-7">
          <Clock size={14} style={{ color: theme.textMuted }} />
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => handleTimeChange(e.target.value)}
            disabled={isSaving}
            className="flex-1 p-2 rounded-lg text-sm border outline-none"
            style={{
              backgroundColor: theme.surface,
              color: theme.text,
              borderColor: theme.border,
            }}
          />
        </div>
      )}

      {/* Help link for notifications */}
      <button
        onClick={openBatterySettings}
        className="text-xs mt-1 underline w-full text-left hover:opacity-80 transition-all"
        style={{ color: theme.textMuted }}
      >
        Not receiving notifications? Tap here for help
      </button>
    </div>
  );
};

// Custom hook that combines preferences and notifications
function useNotificationsWithPreferences() {
  const { preferences, updatePreference } = usePreferences();
  return { preferences, updatePreference };
}