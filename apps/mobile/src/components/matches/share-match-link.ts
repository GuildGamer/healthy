import { Share } from 'react-native';

export async function shareMatchLink(url: string): Promise<void> {
  await Share.share({
    message: url,
    url,
  });
}
