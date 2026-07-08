import React, { useState, useEffect } from 'react';
import { Bell, BellOff, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const defaultTheme = {
  card: '#f5f5f5',
  surface: '#e5e5e5',
  text: '#000000',
  textMuted: '#666666',
  accent: '#488AFF',
  warning: '#f59e0b',
  border: '#dddddd'
};

export const ReminderToggle: React.FC<{ theme?: any }> = ({ theme }) => {
  const t = theme || defaultTheme;
  
  const {
    hasPermission,
    needsExactAlarm,
    reminderTime,
    enableReminder,
    disableReminder,
    requestExactAlarm,
    requestPermission,
    openBatterySettings,
    checkStatus
  } = useNotifications();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [error, setError] = useState('');
  const [pendingSave, setPendingSave] = useState(false); // Track if we need to save after settings

  // Re-check permissions when app resumes
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleResume = async () => {
      await checkStatus();
      // If user was trying to save and now has permission, auto-save
      if (pendingSave) {
        setPendingSave(false);
        handleSaveTime();
      }
    };

    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) handleResume();
    });

    return () => {
      App.removeAllListeners();
    };
  }, [pendingSave, hour, minute]);

  const handleToggle = async () => {
    if (reminderTime) {
      await disableReminder();
      setError('');
    } else {
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) {
          setError('Notification permission denied');
          return;
        }
      }
      setShowTimePicker(true);
      setError('');
    }
  };

  const handleSaveTime = async () => {
    setError('');
    try {
      await enableReminder(hour, minute);
      setShowTimePicker(false);
      setPendingSave(false);
      
      const toast = document.createElement('div');
      toast.textContent = `Reminder set for ${hour}:${String(minute).padStart(2, '0')}`;
      toast.style.cssText = `
        position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
        background: #4CAF50; color: white; padding: 10px 20px;
        border-radius: 10px; z-index: 1000; font-size: 14px;
      `;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
      
    } catch (e: any) {
      if (e.message === 'EXACT_ALARM_PERMISSION_NEEDED') {
        setError('Android requires you to enable exact alarms manually');
        setPendingSave(true); // Remember to save when user returns
        setTimeout(() => requestExactAlarm(), 500);
      } else {
        setError(e.message);
      }
    }
  };

  return (
    <div className="p-4 rounded-xl" style={{ backgroundColor: t.card }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {reminderTime? <Bell size={20} color={t.accent} /> : <BellOff size={20} color={t.textMuted} />}
          <div>
            <p style={{ color: t.text }}>Daily Reminder</p>
            <p className="text-xs" style={{ color: t.textMuted }}>
              {reminderTime
               ? `Every day at ${reminderTime.hour}:${String(reminderTime.minute).padStart(2, '0')}`
                : 'Off'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          className="px-4 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: reminderTime? t.accent : t.surface,
            color: reminderTime? 'white' : t.text
          }}
        >
          {reminderTime? 'Disable' : 'Enable'}
        </button>
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-lg text-xs" style={{ backgroundColor: '#e5393515', color: '#e53935' }}>
          {error}
        </div>
      )}

      {needsExactAlarm && (
        <div className="mt-3 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: t.surface }}>
          <AlertTriangle size={16} color={t.warning} />
          <div className="text-xs flex-1">
            <p style={{ color: t.text }}>Enable exact alarms for on-time reminders</p>
            <p className="mt-1" style={{ color: t.textMuted }}>
              Android requires this for scheduled notifications
            </p>
            <button onClick={requestExactAlarm} className="underline mt-1 font-semibold" style={{ color: t.accent }}>
              Open Settings
            </button>
          </div>
        </div>
      )}

      {showTimePicker && (
        <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: t.surface }}>
          <p className="text-sm mb-2" style={{ color: t.text }}>Set reminder time:</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="23"
              value={hour}
              onChange={e => setHour(Number(e.target.value))}
              className="w-16 p-2 rounded text-center"
              style={{ backgroundColor: t.card, color: t.text, border: `1px solid ${t.border}` }}
            />
            <span style={{ color: t.text }}>:</span>
            <input
              type="number"
              min="0"
              max="59"
              value={minute}
              onChange={e => setMinute(Number(e.target.value))}
              className="w-16 p-2 rounded text-center"
              style={{ backgroundColor: t.card, color: t.text, border: `1px solid ${t.border}` }}
            />
            <button
              onClick={handleSaveTime}
              className="ml-auto px-3 py-2 rounded text-sm"
              style={{ backgroundColor: t.accent, color: 'white' }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      <button
        onClick={openBatterySettings}
        className="text-xs mt-3 underline w-full text-left"
        style={{ color: t.textMuted }}
      >
        Not receiving notifications? Tap here for help
      </button>
    </div>
  );
};