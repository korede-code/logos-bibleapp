// src/hooks/useNotifications.ts
import { useState, useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { NotificationService } from '../services/NotificationService';

export const useNotifications = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [needsExactAlarm, setNeedsExactAlarm] = useState(false);
  const [reminderTime, setReminderTime] = useState<{hour: number, minute: number} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkStatus = async () => {
    console.log('🔄 Checking notification status...');
    
    if (!Capacitor.isNativePlatform()) {
      console.log('⚠️ Not native platform, skipping check');
      setHasPermission(true);
      setNeedsExactAlarm(false);
      setIsLoading(false);
      return;
    }

    try {
      // Check permissions
      const perm = await LocalNotifications.checkPermissions();
      const granted = perm.display === 'granted';
      setHasPermission(granted);
      console.log('📊 Permission status:', granted);

      // Check exact alarm permission (Android 12+)
      if (Capacitor.getPlatform() === 'android') {
        try {
          // Check if we have exact alarm permission
          const exactOk = await NotificationService.checkExactAlarmPermission();
          setNeedsExactAlarm(!exactOk);
          console.log('📊 Exact alarm needed:', !exactOk);
        } catch (e) {
          console.warn('⚠️ Could not check exact alarm permission, assuming needed');
          setNeedsExactAlarm(true);
        }
      } else {
        setNeedsExactAlarm(false);
      }

      // Check if our reminder exists
      const hasReminder = await NotificationService.hasReminder();
      console.log('📊 Has reminder:', hasReminder);
      
      if (hasReminder) {
        const time = await NotificationService.getReminderTime();
        if (time) {
          setReminderTime(time);
          console.log('📊 Reminder time:', time);
        }
      } else {
        setReminderTime(null);
      }
      
    } catch (error) {
      console.error('❌ Error checking status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize on mount
  useEffect(() => {
    NotificationService.init();
    checkStatus();

    let listener: any = null;
    
    const setupListener = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          listener = await App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) {
              console.log('📱 App resumed, rechecking notifications');
              checkStatus();
            }
          });
        } catch (error) {
          console.error('❌ Error setting up listener:', error);
        }
      }
    };
    setupListener();

    return () => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    };
  }, []);

  const enableReminder = async (hour: number, minute: number) => {
    console.log('🔄 Enabling reminder:', { hour, minute });
    
    if (!Capacitor.isNativePlatform()) {
      console.log('⚠️ Not native platform, saving locally');
      setReminderTime({ hour, minute });
      return true;
    }

    try {
      // First, check if we need exact alarm permission
      if (Capacitor.getPlatform() === 'android') {
        const hasExact = await NotificationService.checkExactAlarmPermission();
        if (!hasExact) {
          console.warn('⚠️ Exact alarm permission needed');
          setNeedsExactAlarm(true);
          throw new Error('EXACT_ALARM_PERMISSION_NEEDED');
        }
      }

      // Check notification permission
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const request = await LocalNotifications.requestPermissions();
        if (request.display !== 'granted') {
          throw new Error('Notification permission denied');
        }
        setHasPermission(true);
      }

      await NotificationService.scheduleAlarm(hour, minute);
      await checkStatus();
      console.log('✅ Reminder enabled successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to enable reminder:', error);
      if (error instanceof Error && error.message === 'EXACT_ALARM_PERMISSION_NEEDED') {
        setNeedsExactAlarm(true);
      }
      throw error;
    }
  };

  const disableReminder = async () => {
    console.log('🔄 Disabling reminder');
    try {
      await NotificationService.cancelAlarm();
      await checkStatus();
      console.log('✅ Reminder disabled successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to disable reminder:', error);
      throw error;
    }
  };

  const requestPermission = async () => {
    console.log('🔄 Requesting permission');
    try {
      const result = await LocalNotifications.requestPermissions();
      const granted = result.display === 'granted';
      setHasPermission(granted);
      await checkStatus();
      console.log('✅ Permission result:', granted);
      return granted;
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      return false;
    }
  };

  const requestExactAlarm = async () => {
    console.log('🔄 Requesting exact alarm permission');
    try {
      // Try to open exact alarm settings
      await NotificationService.requestExactAlarmPermission();
      
      // Wait a moment and re-check
      setTimeout(async () => {
        const hasExact = await NotificationService.checkExactAlarmPermission();
        setNeedsExactAlarm(!hasExact);
        console.log('📊 Exact alarm after request:', hasExact);
        
        if (hasExact) {
          // If we now have permission, re-enable the reminder
          const savedTime = localStorage.getItem('pendingReminderTime');
          if (savedTime) {
            try {
              const { hour, minute } = JSON.parse(savedTime);
              await enableReminder(hour, minute);
              localStorage.removeItem('pendingReminderTime');
            } catch (e) {
              console.error('❌ Failed to re-enable after permission:', e);
            }
          }
        }
      }, 1000);
    } catch (error) {
      console.error('❌ Error requesting exact alarm:', error);
    }
  };

  const openBatterySettings = async () => {
    console.log('🔄 Opening battery settings');
    try {
      await NotificationService.openBatterySettings();
    } catch (error) {
      console.error('❌ Error opening battery settings:', error);
    }
  };

  // Save pending reminder time when exact alarm is needed
  const savePendingReminder = (hour: number, minute: number) => {
    localStorage.setItem('pendingReminderTime', JSON.stringify({ hour, minute }));
  };

  return {
    hasPermission,
    needsExactAlarm,
    reminderTime,
    enableReminder,
    disableReminder,
    requestExactAlarm,
    requestPermission,
    openBatterySettings,
    checkStatus,
    isLoading,
    savePendingReminder,
  };
};