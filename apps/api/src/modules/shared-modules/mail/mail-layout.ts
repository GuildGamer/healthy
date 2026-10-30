const NAVY = '#0B1220';
const MINT = '#3DDC97';
const MUTED = '#626C7C';
const PAGE = '#F5F6F8';

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
 * Healthy transactional shell: wordmark, navy page, one mint accent rule.
 * Callers pass already-plain body lines; HTML escaping happens here.
 */
export function brandedMail(input: {
  subject: string;
  eyebrow?: string;
  headline: string;
  bodyLines: readonly string[];
  cta?: { label: string; url: string };
}): MailParts {
  const textParts = [
    input.headline,
    ...input.bodyLines,
    ...(input.cta ? [`${input.cta.label}: ${input.cta.url}`] : []),
    '— Healthy',
  ];

  const bodyHtml = input.bodyLines
    .map((line) => `<p style="margin:0 0 12px;color:${NAVY};font-size:16px;line-height:1.5;">${escapeHtml(line)}</p>`)
    .join('');

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
              <div style="height:6px;width:40px;background:${MINT};border-radius:3px;margin:0 0 20px;"></div>
              ${eyebrowHtml}
              <h1 style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:24px;line-height:1.25;color:${NAVY};font-weight:600;letter-spacing:-0.5px;">${escapeHtml(input.headline)}</h1>
              <div style="font-family:Arial,sans-serif;">${bodyHtml}${ctaHtml}</div>
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
    text: textParts.join('\n\n'),
    html,
  };
}
