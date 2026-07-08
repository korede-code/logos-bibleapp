import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export class NotificationService {
  static async init() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const result = await LocalNotifications.requestPermissions();
      if (result.display!== 'granted') return;

      if (Capacitor.getPlatform() === 'android') {
        await LocalNotifications.createChannel({
          id: 'bible_alarm',
          name: 'Bible Alarm',
          importance: 5,
          sound: 'beep.mp3',
          vibration: true,
        });
      }

      await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        const route = notification.notification.extra?.route;
        if (route) {
          import('../store/appStore').then(({ useAppStore }) => {
            useAppStore.getState().navigate(route);
          });
        }
      });
    } catch (err) {
      console.error('Notification init failed:', err);
    }
  }

  // This is what your hook calls
  static async checkExactAlarmPermission(): Promise<boolean> {
    if (Capacitor.getPlatform()!== 'android') return true;
    try {
      const result = await LocalNotifications.checkPermissions();
      return result.display === 'granted' && result.exactAlarm === 'granted';
    } catch {
      return false;
    }
  }

  static async scheduleAlarm(hour: number, minute: number) {
    if (!Capacitor.isNativePlatform()) return;

    const hasExact = await this.checkExactAlarmPermission();
    if (!hasExact) throw new Error('EXACT_ALARM_PERMISSION_NEEDED');

    const alarmTime = new Date();
    alarmTime.setHours(hour, minute, 0, 0);
    if (alarmTime <= Date.now()) alarmTime.setDate(alarmTime.getDate() + 1);

    await LocalNotifications.schedule({
      notifications: [{
        title: 'Time for Bible Reading',
        body: 'Your daily verse is ready',
        id: 1,
        schedule: {
          at: alarmTime,
          repeats: true,
          allowWhileIdle: true
        },
        sound: 'beep.mp3',
        channelId: 'bible_alarm',
        extra: { route: 'reader' }
      }]
    });
  }

  static async cancelAlarm() {
    if (!Capacitor.isNativePlatform()) return;
    await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
  }

  static async requestExactAlarmPermission() {
    if (Capacitor.getPlatform() !== 'android') return;
    
    try {
      // This intent opens Settings > Apps > YourApp > Alarms & reminders
      await App.openUrl({ 
        url: 'android.settings.REQUEST_SCHEDULE_EXACT_ALARM' 
      });
    } catch (err) {
      // Fallback: open app details page
      await App.openUrl({ 
        url: `package:${Capacitor.getPlatform() === 'android' ? 'com.logosdaily.app' : ''}` 
      });
    }
  }  

  static async openBatterySettings() {
    if (Capacitor.getPlatform() !== 'android') return;
    
    try {
      // Opens Settings > Apps > YourApp > Battery
      await App.openUrl({ 
        url: 'android.settings.APP_BATTERY_SETTINGS',
        extras: {
          'android.provider.extra.APP_PACKAGE': 'com.logosdaily.app' // your appId
        }
      });
    } catch {
      // Fallback: open app info page
      await App.openUrl({ url: 'package:com.logosdaily.app' });
    }
  }
}