// NotificationService.ts
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export class NotificationService {
  private static reminderHour: number = 8;
  private static reminderMinute: number = 0;
  private static notificationId: number = 1001; // Fixed ID for our reminder
  private static isRescheduling: boolean = false;

  static async init() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const result = await LocalNotifications.requestPermissions();
      if (result.display !== 'granted') {
        console.warn('⚠️ Notification permission not granted');
        return;
      }

      if (Capacitor.getPlatform() === 'android') {
        try {
          await LocalNotifications.createChannel({
            id: 'bible_alarm',
            name: 'Bible Reading Reminder',
            description: 'Daily Bible reading reminders',
            importance: 5, // 🔥 Maximum importance for heads-up notification
            visibility: 1, // 🔥 Show on lock screen
            sound: 'default', // 🔥 Use default system sound instead of custom file
            vibration: true,
            lights: true,
            lightColor: '#4CAF50',
            bypassDnd: true, // 🔥 Bypass Do Not Disturb
          });
          console.log('✅ Notification channel created with high importance');
        } catch (channelError) {
          console.log('Channel already exists or error:', channelError);
        }
      }

      // 🔥 Listen for notification while app is open
      await LocalNotifications.addListener('localNotificationReceived', async (notification) => {
        console.log('📬 Notification RECEIVED while app is open:', notification);
        // 🔥 Cancel the old notification and re-schedule for tomorrow
        if (!this.isRescheduling) {
          await this.handleNotificationFired();
        }
      });

      // 🔥 Listen for notification tap
      await LocalNotifications.addListener('localNotificationActionPerformed', async (notification) => {
        console.log('👆 Notification TAPPED:', notification);
        const route = notification.notification.extra?.route;
        if (route) {
          import('../store/appStore').then(({ useAppStore }) => {
            useAppStore.getState().navigate(route);
          });
        }
        // 🔥 Cancel the old notification and re-schedule for tomorrow
        if (!this.isRescheduling) {
          await this.handleNotificationFired();
        }
      });

      console.log('✅ Notification listeners registered');
    } catch (err) {
      console.error('❌ Notification init failed:', err);
    }
  }

  // 🔥 Handle notification firing - cancel old and schedule new
  static async handleNotificationFired() {
    if (this.isRescheduling) {
      console.log('🔄 Already rescheduling, skipping...');
      return;
    }
    
    this.isRescheduling = true;
    console.log('🔄 Notification fired - rescheduling for tomorrow...');
    
    try {
      // 1. Cancel the current notification
      await LocalNotifications.cancel({ 
        notifications: [{ id: this.notificationId }] 
      });
      console.log('✅ Old notification cancelled');
      
      // 2. Schedule new one for tomorrow
      const hour = this.reminderHour;
      const minute = this.reminderMinute;
      
      if (hour !== undefined && minute !== undefined) {
        const alarmTime = new Date();
        alarmTime.setHours(hour, minute, 0, 0);
        alarmTime.setDate(alarmTime.getDate() + 1); // Tomorrow
        alarmTime.setSeconds(0);
        alarmTime.setMilliseconds(0);
        
        console.log('⏰ Scheduling new alarm for:', alarmTime);
        
        // In scheduleAlarm method
        await LocalNotifications.schedule({
          notifications: [{
            title: '📖 Time for Bible Reading',
            body: 'Your daily verse is ready! Tap to read now.',
            id: this.notificationId,
            schedule: {
              at: alarmTime,
              repeats: false,
              allowWhileIdle: true
            },
            sound: 'default', // 🔥 Use default system sound
            channelId: 'bible_alarm',
            extra: { 
              route: 'reader',
              hour: hour,
              minute: minute,
              isReminder: true
            },
            // 🔥 Android-specific options
            actionTypeId: 'OPEN_READER',
            attachments: [],
            smallIcon: 'ic_stat_icon', // Your app icon
            largeIcon: 'ic_launcher', // Your app logo
            // 🔥 Force heads-up notification
            showWhen: true,
            autoCancel: false // Don't auto-dismiss
          }]
        });
        console.log('✅ New alarm scheduled for tomorrow');
      }
    } catch (error) {
      console.error('❌ Error rescheduling:', error);
    } finally {
      this.isRescheduling = false;
    }
  }

  static async checkExactAlarmPermission(): Promise<boolean> {
    if (Capacitor.getPlatform() !== 'android') return true;
    try {
      const result = await LocalNotifications.checkPermissions();
      return result.display === 'granted';
    } catch {
      return false;
    }
  }

  static async scheduleAlarm(hour: number, minute: number) {
    if (!Capacitor.isNativePlatform()) return;

    // Store the time for re-scheduling
    this.reminderHour = hour;
    this.reminderMinute = minute;

    const hasExact = await this.checkExactAlarmPermission();
    if (!hasExact) {
      console.warn('⚠️ Exact alarm permission needed');
      throw new Error('EXACT_ALARM_PERMISSION_NEEDED');
    }

    // 🔥 Cancel any existing notification first
    await this.cancelAlarm();

    // Calculate next occurrence
    const alarmTime = new Date();
    alarmTime.setHours(hour, minute, 0, 0);
    alarmTime.setSeconds(0);
    alarmTime.setMilliseconds(0);
    
    // If the time has already passed today, schedule for tomorrow
    if (alarmTime <= new Date()) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }

    console.log('⏰ Scheduling alarm for:', alarmTime);

    await LocalNotifications.schedule({
      notifications: [{
        title: 'Time for Bible Reading',
        body: 'Your daily verse is ready',
        id: this.notificationId,
        schedule: {
          at: alarmTime,
          repeats: false, // Don't repeat - we'll re-schedule manually
          allowWhileIdle: true
        },
        sound: 'default',
        channelId: 'bible_alarm',
        extra: { 
          route: 'reader',
          hour: hour,
          minute: minute,
          isReminder: true
        }
      }]
    });
    
    console.log('✅ Alarm scheduled successfully with ID:', this.notificationId);
    
    // Verify it was scheduled
    const pending = await LocalNotifications.getPending();
    console.log('📊 Pending notifications after schedule:', pending);
  }

  static async cancelAlarm() {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      // Cancel our specific notification
      await LocalNotifications.cancel({ 
        notifications: [{ id: this.notificationId }] 
      });
      console.log('✅ Alarm cancelled for ID:', this.notificationId);
      
      // Verify it was cancelled
      const pending = await LocalNotifications.getPending();
      const stillExists = pending.notifications.some(n => n.id === this.notificationId);
      if (!stillExists) {
        console.log('✅ Confirmed: Notification cancelled');
      }
    } catch (error) {
      console.error('❌ Error cancelling alarm:', error);
    }
  }

  static async getPendingNotifications() {
    if (!Capacitor.isNativePlatform()) return [];
    try {
      const pending = await LocalNotifications.getPending();
      return pending.notifications || [];
    } catch (error) {
      console.error('❌ Error getting pending notifications:', error);
      return [];
    }
  }

  static async hasReminder(): Promise<boolean> {
    const pending = await this.getPendingNotifications();
    return pending.some(n => n.id === this.notificationId);
  }

  static async getReminderTime(): Promise<{hour: number, minute: number} | null> {
    const pending = await this.getPendingNotifications();
    const notif = pending.find(n => n.id === this.notificationId);
    
    if (notif && notif.schedule?.at) {
      const date = new Date(notif.schedule.at);
      return { hour: date.getHours(), minute: date.getMinutes() };
    }
    return null;
  }

  static async requestExactAlarmPermission() {
    if (Capacitor.getPlatform() !== 'android') return;
    
    try {
      await App.openUrl({
        url: 'android.settings.REQUEST_SCHEDULE_EXACT_ALARM'
      });
    } catch (err) {
      console.warn('Could not open exact alarm settings:', err);
      try {
        await App.openUrl({
          url: 'package:com.logosdaily.app'
        });
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    }
  }

  static async openBatterySettings() {
    if (Capacitor.getPlatform() !== 'android') return;
    
    try {
      await App.openUrl({
        url: 'android.settings.APP_BATTERY_SETTINGS',
        extras: {
          'android.provider.extra.APP_PACKAGE': 'com.logosdaily.app'
        }
      });
    } catch (err) {
      console.warn('Could not open battery settings:', err);
      try {
        await App.openUrl({
          url: 'package:com.logosdaily.app'
        });
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    }
  }
}