import { Redirect } from 'expo-router';

/** Legacy `/home` route — keep for deep links, send users to tabs. */
export default function HomeRedirect() {
  return <Redirect href="/(tabs)" />;
}
