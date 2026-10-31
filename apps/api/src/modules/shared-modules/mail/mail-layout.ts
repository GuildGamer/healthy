const NAVY = '#0B1220';
const MINT = '#3DDC97';
const MUTED = '#626C7C';
const PAGE = '#F5F6F8';
const CODE_BLOCK = '#EEF1F5';

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
 * Healthy transactional shell: Clinic white card, navy wordmark, optional
 * large OTP code block, optional mint CTA. No accent “progress” bar.
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
    '— Healthy',
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

  const ctaHtml = input.cta
    ? `<p style="margin:28px 0 0;">
         <a href="${escapeHtml(input.cta.url)}"
            style="display:inline-block;background:${MINT};color:${NAVY};text-decoration:none;font-weight:600;font-size:16px;padding:14px 22px;border-radius:12px;">
           ${escapeHtml(input.cta.label)}
         </a>
       </p>`
    : '';

  const eyebrowHtml = input.eyebrow
    ? `<p style="margin:0 0 8px;color:${MUTED};font-size:12px;letter-spacing:0.6px;text-transform:uppercase;">${escapeHtml(input.eyebrow)}</p>`
    : '';

  const headlineHtml = input.headline
    ? `<h1 style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:24px;line-height:1.25;color:${NAVY};font-weight:600;letter-spacing:-0.5px;">${escapeHtml(input.headline)}</h1>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:${PAGE};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${PAGE};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;padding:28px 24px;">
          <tr>
            <td>
              <p style="margin:0 0 20px;font-family:Arial,sans-serif;font-size:22px;font-weight:800;color:${NAVY};letter-spacing:-0.5px;">Healthy</p>
              ${eyebrowHtml}
              ${headlineHtml}
              <div style="font-family:Arial,sans-serif;">${bodyBeforeHtml}${codeHtml}${bodyAfterHtml}${ctaHtml}</div>
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
