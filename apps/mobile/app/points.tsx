import { Redirect } from 'expo-router';

/** Legacy `/points` route — points history is History now. */
export default function PointsRedirect() {
  return <Redirect href="/history" />;
}
