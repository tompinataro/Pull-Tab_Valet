import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { supabase } from '@/src/lib/supabase';

export default function AuthLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        if (data.session) {
          router.replace('/(tabs)/venues');
        }
      } finally {
        if (mounted) setChecking(false);
      }
    }

    run();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/(tabs)/venues');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0b0f' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
