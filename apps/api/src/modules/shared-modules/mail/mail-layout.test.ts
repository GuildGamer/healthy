import { describe, expect, it } from 'vitest';
import { brandedMail } from './mail-layout.js';
import { otpMailContent } from './otp-mail-content.js';
import {
  periodRecapMail,
  pickRecapCopy,
  recapMailTone,
} from './period-recap-mail-content.js';

describe('brandedMail', () => {
  it('escapes HTML and keeps a text part', () => {
    const mail = brandedMail({
      subject: 'Hello',
      headline: 'Hi <Ada>',
      bodyLines: ['Line & one'],
      cta: { label: 'Open', url: 'https://example.com?a=1&b=2' },
    });

    expect(mail.text).toContain('Hi <Ada>');
    expect(mail.html).toContain('Hi &lt;Ada&gt;');
    expect(mail.html).toContain('Line &amp; one');
    expect(mail.html).toContain('Open');
    expect(mail.html).toContain('wordmark-navy.png');
    expect(mail.html).toContain('background:#0B1220');
    expect(mail.html).toContain('color:#FFFFFF');
    expect(mail.html).not.toContain('background:#3DDC97');
  });
});

describe('otpMailContent', () => {
  it('brands each OTP kind with a large code block and no mint accent bar', () => {
    const mail = otpMailContent('password-reset', '123456');
    expect(mail.subject).toContain('password reset');
    expect(mail.text).toContain('Use this code to reset your password.');
    expect(mail.text).toContain('123456');
    expect(mail.html).toContain('letter-spacing:8px');
    expect(mail.html).toContain('123456');
    expect(mail.html).toContain('Beatset');
    expect(mail.html).not.toContain('Reset your password');
    expect(mail.html).not.toContain('height:6px');
    expect(mail.html).not.toContain('width:40px');
  });
});

describe('recapMailTone', () => {
  it('buckets a week by active days', () => {
    expect(recapMailTone(0, 'week')).toBe('quiet');
    expect(recapMailTone(2, 'week')).toBe('warm');
    expect(recapMailTone(4, 'week')).toBe('hot');
    expect(recapMailTone(6, 'week')).toBe('fire');
    expect(recapMailTone(7, 'week')).toBe('fire');
  });
});

describe('periodRecapMail', () => {
  it('uses tone copy and keeps numbers off the body', () => {
    const mail = periodRecapMail({
      period: 'week',
      periodLabel: 'Oct 19–25',
      activeDays: 6,
      highlightLine: '240 push-ups',
      reportUrl:
        'https://www.gethealthyapp.com/progress/report?period=week&on=2026-10-25',
      homeUrl: 'https://www.gethealthyapp.com/open',
    });

    expect(mail.subject).toBe('Your week on Beatset 🏆');
    expect(mail.html).toContain('Open in Beatset');
    expect(mail.html).toContain('progress/report');
    expect(mail.html).not.toContain('Do a set');
    expect(mail.text).not.toContain('6 days active');
    expect(mail.text).not.toContain('240 push-ups');
    expect(mail.html).not.toContain('6 days active');
    expect(mail.html).not.toContain('240 push-ups');

    const expected = pickRecapCopy('fire', 'week', 'Oct 19–25:6');
    expect(mail.text).toContain(expected.headline);
    expect(mail.text).toContain(expected.body);
  });

  it('encourages when the period was quiet and opens the day deck', () => {
    const mail = periodRecapMail({
      period: 'week',
      periodLabel: 'Oct 19–25',
      activeDays: 0,
      highlightLine: null,
      reportUrl:
        'https://www.gethealthyapp.com/progress/report?period=week&on=2026-10-25',
      homeUrl: 'https://www.gethealthyapp.com/open',
    });

    expect(mail.subject).toBe('Your week on Beatset');
    expect(mail.html).toContain('Do a set');
    expect(mail.html).toContain('/open');
    expect(mail.html).not.toContain('progress/report');
    const expected = pickRecapCopy('quiet', 'week', 'Oct 19–25:0');
    expect(mail.text).toContain(expected.headline);
    expect(mail.text).toContain(expected.body);
  });
});
