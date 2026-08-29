import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { OtpInput } from './OtpInput';

function Harness() {
  const [value, setValue] = useState('');
  return <OtpInput onChange={setValue} testID="otp" value={value} />;
}

describe('OtpInput', () => {
  it('keeps only six digits', () => {
    render(<Harness />);

    fireEvent.changeText(screen.getByTestId('otp'), '12a34567');

    expect(screen.getByTestId('otp')).toHaveProp('value', '123456');
  });
});
