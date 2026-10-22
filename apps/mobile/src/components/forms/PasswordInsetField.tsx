import { useState } from 'react';
import { InsetField, type InsetFieldProps } from './InsetField';

type PasswordInsetFieldProps = Omit<
  InsetFieldProps,
  'label' | 'secureTextEntry' | 'side' | 'autoCapitalize' | 'autoCorrect'
> & {
  label?: string;
  /** `new` for sign-up and reset, so the phone offers a strong password. */
  purpose: 'new' | 'current';
  testID: string;
};

/** One password with Show, instead of typing it twice. */
export function PasswordInsetField({
  label = 'Password',
  purpose,
  testID,
  ...fieldProps
}: PasswordInsetFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <InsetField
      {...fieldProps}
      autoCapitalize="none"
      autoComplete={purpose === 'new' ? 'new-password' : 'current-password'}
      autoCorrect={false}
      label={label}
      secureTextEntry={!isVisible}
      side={{
        label: isVisible ? 'Hide' : 'Show',
        onPress: () => setIsVisible((visible) => !visible),
        testID: `${testID}-toggle`,
      }}
      testID={testID}
      textContentType={purpose === 'new' ? 'newPassword' : 'password'}
    />
  );
}
