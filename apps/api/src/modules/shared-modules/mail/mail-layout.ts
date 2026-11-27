const NAVY = '#0B1220';
const MUTED = '#626C7C';
const PAGE = '#F5F6F8';
const CODE_BLOCK = '#EEF1F5';
const CTA_LABEL = '#FFFFFF';

/** Public Clinic lockup on the marketing site (PNG for mail clients). */
export const MAIL_WORDMARK_URL = 'https://beatset.tech/wordmark-navy.png';

export type MailParts = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * Beatset transactional shell: Clinic white card, navy lockup, navy primary
 * CTA (white label). Optional Clinic colour rail. No mint night chrome.
 */
export function brandedMail(input: {
  subject: string;
  eyebrow?: string;
  /** Omit for OTP: Figma shows wordmark + intro, not a separate H1. */
  headline?: string;
  bodyLines: readonly string[];
  /** Large numeral block for OTP. */
  code?: string;
  cta?: { label: string; url: string };
  /** Absolute URL for the header lockup. Defaults to the public navy PNG. */
  wordmarkUrl?: string;
  /** Clinic activity rail along the top of the white card (hex). */
  accentRail?: string;
  /** Optional HTML block under the body (e.g. hosted share card image). */
  mediaHtml?: string;
  /** Inbox preview line; hidden in the visible layout. */
  preheader?: string;
}): MailParts {
  const bodyBeforeCode = input.code
    ? input.bodyLines.slice(0, 1)
    : input.bodyLines;
  const bodyAfterCode = input.code ? input.bodyLines.slice(1) : [];

  const text = [
    ...(input.headline ? [input.headline] : []),
    ...bodyBeforeCode,
    ...(input.code ? [input.code] : []),
    ...bodyAfterCode,
    ...(input.cta ? [`${input.cta.label}: ${input.cta.url}`] : []),
    '— Beatset',
  ]
    .filter((line) => line.length > 0)
    .join('\n\n');

  const paragraph = (line: string, muted = false) =>
    `<p style="margin:0 0 12px;color:${muted ? MUTED : NAVY};font-size:${muted ? 13 : 16}px;line-height:1.5;">${escapeHtml(line)}</p>`;

  const bodyBeforeHtml = bodyBeforeCode.map((line) => paragraph(line)).join('');
  const bodyAfterHtml = bodyAfterCode
    .map((line, index) => paragraph(line, index === 0 && Boolean(input.code)))
    .join('');

  const codeHtml = input.code
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 16px;">
         <tr>
           <td align="center" style="background:${CODE_BLOCK};border-radius:12px;padding:20px 16px;">
             <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:40px;font-weight:800;letter-spacing:8px;color:${NAVY};line-height:1;">${escapeHtml(input.code)}</p>
           </td>
         </tr>
       </table>`
    : '';

  const mediaHtml = input.mediaHtml
    ? `<div style="margin:24px 0 8px;text-align:center;">${input.mediaHtml}</div>`
    : '';

  const ctaHtml = input.cta
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0 0;">
         <tr>
           <td>
             <a href="${escapeHtml(input.cta.url)}"
                style="display:block;text-align:center;background:${NAVY};color:${CTA_LABEL};text-decoration:none;font-weight:600;font-size:16px;padding:14px 22px;border-radius:12px;">
               ${escapeHtml(input.cta.label)}
             </a>
           </td>
         </tr>
       </table>`
    : '';

  const eyebrowHtml = input.eyebrow
    ? `<p style="margin:0 0 8px;color:${MUTED};font-size:12px;font-weight:500;letter-spacing:0.6px;text-transform:uppercase;">${escapeHtml(input.eyebrow)}</p>`
    : '';

  const headlineHtml = input.headline
    ? `<h1 style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:26px;line-height:1.2;color:${NAVY};font-weight:600;letter-spacing:-0.6px;">${escapeHtml(input.headline)}</h1>`
    : '';

  const wordmarkUrl = input.wordmarkUrl ?? MAIL_WORDMARK_URL;
  /** Full stacked lockup is ~7:8; keep email header compact. */
  const wordmarkHtml = `<p style="margin:0 0 24px;">
    <img src="${escapeHtml(wordmarkUrl)}" width="42" height="48" alt="Beatset" style="display:block;border:0;width:42px;height:48px;" />
  </p>`;

  const rail = input.accentRail
    ? `<tr><td style="background:${escapeHtml(input.accentRail)};height:6px;font-size:0;line-height:0;">&nbsp;</td></tr>`
    : '';

  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(input.preheader)}</div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:${PAGE};">
  ${preheader}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${PAGE};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
          ${rail}
          <tr>
            <td style="padding:28px 24px;">
              ${wordmarkHtml}
              ${eyebrowHtml}
              ${headlineHtml}
              <div style="font-family:Arial,sans-serif;">${bodyBeforeHtml}${codeHtml}${bodyAfterHtml}${mediaHtml}${ctaHtml}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: input.subject,
    text,
    html,
  };
}
