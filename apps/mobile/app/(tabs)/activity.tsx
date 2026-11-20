import { Redirect } from 'expo-router';

/** The Activity tab is gone; old links land on History. */
export default function ActivityRedirect() {
  return <Redirect href="/history" />;
}
