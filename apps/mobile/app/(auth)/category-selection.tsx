import { useRouter } from 'expo-router';
import { CategorySelectionScreen } from '@/components/auth';

export default function CategorySelection() {
  const router = useRouter();

  return <CategorySelectionScreen onContinue={() => router.replace('/home')} />;
}
