import SignInScreen from './(auth)/sign-in';

// On the packaged desktop build we load the app over file://.
// Rendering the sign-in screen directly avoids an initial absolute-path redirect,
// which can fail before the first usable screen appears.
export default function Index() {
  return <SignInScreen />;
}
