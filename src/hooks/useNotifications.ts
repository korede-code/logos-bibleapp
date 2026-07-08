import { useState, useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { NotificationService } from '../services/NotificationService';

export const useNotifications = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [needsExactAlarm, setNeedsExactAlarm] = useState(false);
  const [reminderTime, setReminderTime] = useState<{hour: number, minute: number} | null>(null);

  const checkStatus = async () => {
    if (!Capacitor.isNativePlatform()) return;

    const perm = await LocalNotifications.checkPermissions();
    setHasPermission(perm.display === 'granted');

    const exactOk = await NotificationService.checkExactAlarmPermission();
    setNeedsExactAlarm(!exactOk);

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      const notif = pending.notifications[0];
      const date = new Date(notif.schedule?.at!);
      setReminderTime({ hour: date.getHours(), minute: date.getMinutes() });
    } else {
      setReminderTime(null);
    }
  };

  useEffect(() => {
    NotificationService.init();
    checkStatus();
  }, []);

  const enableReminder = async (hour: number, minute: number) => {
    await NotificationService.scheduleAlarm(hour, minute);
    await checkStatus();
  };

  const disableReminder = async () => {
    await NotificationService.cancelAlarm();
    await checkStatus();
  };

  const requestPermission = async () => {
    const result = await LocalNotifications.requestPermissions();
    await checkStatus();
    return result.display === 'granted';
  };

  const requestExactAlarm = async () => {
    await NotificationService.requestExactAlarmPermission();
  };

  const openBatterySettings = async () => {
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
    checkStatus
  };
};