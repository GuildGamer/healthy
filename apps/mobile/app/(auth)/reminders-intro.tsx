import { useRouter } from 'expo-router';
import { RemindersIntroScreen } from '@/components/auth';
import { resolvePostAuthHref } from '@/lib/resolve-post-auth';

export default function RemindersIntro() {
  const router = useRouter();

  return (
    <RemindersIntroScreen
      onAnswered={() => {
        void resolvePostAuthHref().then((href) => router.replace(href ?? '/(tabs)'));
      }}
    />
  );
}
