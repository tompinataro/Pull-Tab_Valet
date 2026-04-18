import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { flushQueue } from './utils/offlineQueue';
import { fetchTodayRoutes } from './api/client';
import { AUTH_TOKEN_KEY } from './auth/types';

const TASK_NAME = 'BS_BG_SYNC';
const BackgroundFetchCompat = BackgroundFetch as any;
const FETCH_RESULT = BackgroundFetchCompat.BackgroundFetchResult || BackgroundFetchCompat.Result || {};
const FETCH_STATUS = BackgroundFetchCompat.BackgroundFetchStatus || BackgroundFetchCompat.Status || {};

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return FETCH_RESULT.NoData ?? 'NoData';
    let sent = 0;
    try {
      const res = await flushQueue(token);
      sent = res.sent;
    } catch {}
    try {
      // Touch routes to update local server-truth flags if available
      await fetchTodayRoutes(token).catch(() => {});
    } catch {}
    return sent > 0 ? (FETCH_RESULT.NewData ?? 'NewData') : (FETCH_RESULT.NoData ?? 'NoData');
  } catch {
    return FETCH_RESULT.Failed ?? 'Failed';
  }
});

export async function registerBackgroundSync() {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status === FETCH_STATUS.Restricted || status === FETCH_STATUS.Denied) {
      return false;
    }
    const registered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (!registered) {
      await BackgroundFetch.registerTaskAsync(TASK_NAME, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
    return true;
  } catch {
    return false;
  }
}

export async function unregisterBackgroundSync() {
  try {
    const registered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (registered) {
      await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
    }
  } catch {}
}
