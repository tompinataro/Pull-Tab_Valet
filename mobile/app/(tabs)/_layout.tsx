import { Redirect, Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { supabase } from '../../src/lib/supabase';

export default function TabsLayout() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setAuthed(Boolean(data.session));
      } finally {
        if (mounted) setChecking(false);
      }
    }

    run();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(Boolean(session));
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0b0f' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!authed) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs>
      <Tabs.Screen name="venues" options={{ title: 'Venues' }} />
      <Tabs.Screen name="scan" options={{ title: 'Scan' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
