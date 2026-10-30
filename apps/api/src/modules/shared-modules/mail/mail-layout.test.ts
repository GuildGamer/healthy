import { describe, expect, it } from 'vitest';
import { brandedMail } from './mail-layout.js';
import { otpMailContent } from './otp-mail-content.js';
import { periodRecapMail } from './period-recap-mail-content.js';

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
  });
});

describe('otpMailContent', () => {
  it('brands each OTP kind', () => {
    const mail = otpMailContent('password-reset', '123456');
    expect(mail.subject).toContain('password reset');
    expect(mail.html).toContain('123456');
    expect(mail.html).toContain('Healthy');
  });
});

describe('periodRecapMail', () => {
  it('offers Open in Healthy', () => {
    const mail = periodRecapMail({
      period: 'week',
      periodLabel: 'Oct 19–25',
      activeDays: 6,
      highlightLine: '240 push-ups',
      openUrl: 'https://www.gethealthyapp.com/app/progress/report?period=week',
    });

    expect(mail.subject).toBe('Your week on Healthy');
    expect(mail.html).toContain('Open in Healthy');
    expect(mail.text).toContain('6 days active');
  });
});
