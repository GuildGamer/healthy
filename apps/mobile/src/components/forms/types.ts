import type Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof Feather>['name'];

/** `outline` is a quiet full-width choice beside others, as on the sign-in screens. */
/** `danger` is the one irreversible act on a page, such as deleting an account. */
export type FormButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';
