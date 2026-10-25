import { Redirect } from 'expo-router';

/** Condition picker is hidden while CONDITION_FEATURES_ENABLED is false. */
export default function ConditionsSettingsRoute() {
  return <Redirect href="/settings" />;
}
