import { Redirect } from 'expo-router';

/** Quiet-recap universal link lands here, then onto today's deck. */
export default function OpenDayDeckRoute() {
  return <Redirect href="/(tabs)" />;
}
