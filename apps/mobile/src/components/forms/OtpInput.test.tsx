import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { OtpInput } from './OtpInput';

function Harness() {
  const [value, setValue] = useState('');
  return <OtpInput onChange={setValue} testID="otp" value={value} />;
}

function expectBoxes(code: string) {
  for (const digit of code) {
    expect(screen.getByText(digit)).toBeOnTheScreen();
  }
}

describe('OtpInput', () => {
  it('offers a keyboard that can paste and keeps one-time-code autofill', () => {
    render(<Harness />);

    const input = screen.getByTestId('otp');
    const keyboardType = Platform.OS === 'ios' ? 'ascii-capable-number-pad' : 'number-pad';

    expect(input).toHaveProp('keyboardType', keyboardType);
    expect(input).toHaveProp('textContentType', 'oneTimeCode');
    expect(input).toHaveProp(
      'autoComplete',
      Platform.OS === 'android' ? 'sms-otp' : 'one-time-code',
    );
    expect(StyleSheet.flatten(input.props.style).opacity).toBeUndefined();
  });

  it('fills every box when a code is pasted', () => {
    render(<Harness />);

    fireEvent.changeText(screen.getByTestId('otp'), '123456');

    expect(screen.getByTestId('otp')).toHaveProp('value', '123456');
    expectBoxes('123456');
  });

  it('keeps the digits from a spaced or labeled paste', () => {
    const { unmount } = render(<Harness />);

    fireEvent.changeText(screen.getByTestId('otp'), '12 34 56');

    expect(screen.getByTestId('otp')).toHaveProp('value', '123456');
    expectBoxes('123456');

    unmount();
    render(<Harness />);

    fireEvent.changeText(screen.getByTestId('otp'), 'code 123456');

    expect(screen.getByTestId('otp')).toHaveProp('value', '123456');
  });

  it('keeps the first six digits of a too-long paste', () => {
    render(<Harness />);

    fireEvent.changeText(screen.getByTestId('otp'), '1234567890');

    expect(screen.getByTestId('otp')).toHaveProp('value', '123456');
    expectBoxes('123456');
  });

  it('replaces the boxes from the first cell when a full code is pasted over a partial entry', () => {
    render(<Harness />);

    fireEvent.changeText(screen.getByTestId('otp'), '99');
    fireEvent.changeText(screen.getByTestId('otp'), '99123456');

    expect(screen.getByTestId('otp')).toHaveProp('value', '123456');
  });

  it('keeps a short entry when the next change is not a full code', () => {
    render(<Harness />);

    fireEvent.changeText(screen.getByTestId('otp'), '12');
    fireEvent.changeText(screen.getByTestId('otp'), '123');
    fireEvent.changeText(screen.getByTestId('otp'), '12');

    expect(screen.getByTestId('otp')).toHaveProp('value', '12');
  });
});
