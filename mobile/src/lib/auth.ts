import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';

const DEMO_SESSION_KEY = 'ptv-demo-session';

export const DEMO_EMAIL = 'demo@example.com';
export const DEMO_PASSWORD = 'password';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function isDemoSessionActive() {
  return (await AsyncStorage.getItem(DEMO_SESSION_KEY)) === 'true';
}

export async function getIsSignedIn() {
  if (await isDemoSessionActive()) return true;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export async function signInWithAppAuth(email: string, password: string) {
  if (normalizeEmail(email) === DEMO_EMAIL && password === DEMO_PASSWORD) {
    await AsyncStorage.setItem(DEMO_SESSION_KEY, 'true');
    return { mode: 'demo' as const };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });

  if (error) throw error;

  await AsyncStorage.removeItem(DEMO_SESSION_KEY);
  return { mode: 'supabase' as const };
}

export async function signOutFromAppAuth() {
  const demoSession = await isDemoSessionActive();

  if (demoSession) {
    await AsyncStorage.removeItem(DEMO_SESSION_KEY);
  }

  const { error } = await supabase.auth.signOut();
  if (error && !demoSession) {
    throw error;
  }
}
