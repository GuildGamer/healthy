import type Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof Feather>['name'];

export interface PasswordRequirement {
  text: string;
  valid: boolean;
}

export type FormButtonVariant = 'primary' | 'secondary';
