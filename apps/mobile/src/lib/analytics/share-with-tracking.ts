import { Share, type ShareContent, type ShareOptions } from 'react-native';
import { trackEvent } from './track';

type ShareResult = Awaited<ReturnType<typeof Share.share>>;

/**
 * Wraps `Share.share` and records whether the person completed the sheet.
 * iOS returns `activityType`; Android often only says dismissed vs shared.
 */
export async function shareWithTracking(
  surface: string,
  content: ShareContent,
  options?: ShareOptions,
): Promise<ShareResult> {
  try {
    const result = await Share.share(content, options);
    const completed = result.action === Share.sharedAction;
    trackEvent('share_completed', {
      surface,
      completed,
      ...(typeof result.activityType === 'string'
        ? { activityType: result.activityType }
        : {}),
    });
    return result;
  } catch (error) {
    trackEvent('share_completed', { surface, completed: false });
    throw error;
  }
}
