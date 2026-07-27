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
    if (!Capacitor.isNativePlatform()) {
      setIsLoading(false);
      return;
    }

    try {
      // Check permissions
      const perm = await LocalNotifications.checkPermissions();
      setHasPermission(perm.display === 'granted');

      // Check exact alarm permission
      if (Capacitor.getPlatform() === 'android') {
        const exactOk = await NotificationService.checkExactAlarmPermission();
        setNeedsExactAlarm(!exactOk);
      } else {
        setNeedsExactAlarm(false);
      }

      // 🔥 Check if our reminder exists
      const hasReminder = await NotificationService.hasReminder();
      
      if (hasReminder) {
        const time = await NotificationService.getReminderTime();
        if (time) {
          setReminderTime(time);
          console.log('📊 Reminder found:', time);
        }
      } else {
        setReminderTime(null);
        console.log('📊 No reminder found');
      }
      
    } catch (error) {
      console.error('❌ Error checking status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    NotificationService.init();
    checkStatus();

    let listener: any = null;
    const setupListener = async () => {
      if (Capacitor.isNativePlatform()) {
        listener = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            console.log('📱 App resumed, rechecking notifications');
            checkStatus();
          }
        });
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
    try {
      await NotificationService.scheduleAlarm(hour, minute);
      await checkStatus();
      return true;
    } catch (error) {
      console.error('❌ Failed to enable reminder:', error);
      throw error;
    }
  };

  const disableReminder = async () => {
    console.log('🔄 Disabling reminder');
    try {
      await NotificationService.cancelAlarm();
      await checkStatus();
      return true;
    } catch (error) {
      console.error('❌ Failed to disable reminder:', error);
      throw error;
    }
  };

  const requestPermission = async () => {
    console.log('🔄 Requesting permission');
    const result = await LocalNotifications.requestPermissions();
    await checkStatus();
    return result.display === 'granted';
  };

  const requestExactAlarm = async () => {
    console.log('🔄 Requesting exact alarm permission');
    await NotificationService.requestExactAlarmPermission();
  };

  const openBatterySettings = async () => {
    console.log('🔄 Opening battery settings');
    await NotificationService.openBatterySettings();
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
    isLoading
  };
};