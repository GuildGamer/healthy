import { inviteHrefFromUrl } from './invite-link';

const TOKEN = 'abc_token-1';

describe('inviteHrefFromUrl', () => {
  it('maps the shared https invite to the join route', () => {
    expect(inviteHrefFromUrl(`https://www.gethealthyapp.com/match/${TOKEN}`)).toBe(
      `/match/${TOKEN}`,
    );
  });

  it('keeps the token when the apex host is delivered without a redirect', () => {
    expect(inviteHrefFromUrl(`https://gethealthyapp.com/match/${TOKEN}`)).toBe(`/match/${TOKEN}`);
  });

  it('tolerates a trailing slash', () => {
    expect(inviteHrefFromUrl(`https://www.gethealthyapp.com/match/${TOKEN}/`)).toBe(
      `/match/${TOKEN}`,
    );
  });

  it('maps the custom scheme as the webview fallback', () => {
    expect(inviteHrefFromUrl(`healthy://match/${TOKEN}`)).toBe(`/match/${TOKEN}`);
  });

  it('ignores the rest of the site, other hosts, and the match board', () => {
    expect(inviteHrefFromUrl('https://www.gethealthyapp.com/privacy')).toBeNull();
    expect(inviteHrefFromUrl('https://www.gethealthyapp.com/')).toBeNull();
    expect(inviteHrefFromUrl(`https://example.com/match/${TOKEN}`)).toBeNull();
    expect(inviteHrefFromUrl(`https://www.gethealthyapp.com/matches/${TOKEN}`)).toBeNull();
    expect(inviteHrefFromUrl('healthy://matches/abc_token-1')).toBeNull();
    expect(inviteHrefFromUrl('not a url')).toBeNull();
  });
});
