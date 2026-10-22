import { ActionSheetIOS, Alert, Platform } from 'react-native';
import { SETTINGS_COPY } from './constants/routine-copy';

const REMOVE_INDEX = 0;
const KEEP_INDEX = 1;

/** The system's own confirm, saying what you keep: Remove in red, Keep as the safe way out. */
export function confirmRemoval(title: string, onRemove: () => void): void {
  const heading = `Remove ${title}?`;

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: heading,
        message: SETTINGS_COPY.removeBody,
        options: [SETTINGS_COPY.removeConfirm, SETTINGS_COPY.keep],
        destructiveButtonIndex: REMOVE_INDEX,
        cancelButtonIndex: KEEP_INDEX,
      },
      (index) => {
        if (index === REMOVE_INDEX) {
          onRemove();
        }
      },
    );
    return;
  }

  Alert.alert(heading, SETTINGS_COPY.removeBody, [
    { text: SETTINGS_COPY.keep, style: 'cancel' },
    { text: SETTINGS_COPY.removeConfirm, style: 'destructive', onPress: onRemove },
  ]);
}
