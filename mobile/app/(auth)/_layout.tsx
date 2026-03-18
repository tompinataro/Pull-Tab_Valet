import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { getIsSignedIn } from '../../src/lib/auth';

export default function AuthLayout() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const signedIn = await getIsSignedIn();
        if (!mounted) return;
        setAuthed(signedIn);
      } finally {
        if (mounted) setChecking(false);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0b0f' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (authed) {
    return <Redirect href="/(tabs)/venues" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
