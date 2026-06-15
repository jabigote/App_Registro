import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

export const NOTIFICATION_REMINDER_KEY = '@salvagnini_notif_cierre';
export const NOTIFICATION_REMINDER_HOURS_KEY = '@salvagnini_notif_cierre_horas';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
});

export async function scheduleFichajeReminder(inicio: string, fecha?: string): Promise<string | null> {
  try {
    const enabled = await AsyncStorage.getItem(NOTIFICATION_REMINDER_KEY);
    if (enabled === 'false') return null;
    const storedHours = Number(await AsyncStorage.getItem(NOTIFICATION_REMINDER_HOURS_KEY));
    const reminderHours = Number.isFinite(storedHours) && storedHours > 0 ? storedHours : 9;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;

    const [h, m] = inicio.split(':').map(Number);
    const date = fecha ? new Date(`${fecha}T12:00:00`) : new Date();
    date.setHours(h + reminderHours, m, 0, 0);
    // Si la hora de aviso ya pasó hoy, avisar en 30 minutos
    if (date <= new Date()) date.setTime(Date.now() + 30 * 60 * 1000);

    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '¿Has fichado la salida?',
        body:  `Llevas más de ${reminderHours}h de jornada desde las ${inicio}.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelFichajeReminder(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // silently ignore
  }
}
