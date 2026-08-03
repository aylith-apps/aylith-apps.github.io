// Where the static site reaches the aylith-ai gateway. The site is static, so we
// resolve at runtime in the browser rather than at build: a `window` override
// wins, then localhost/lvh.me dev points at the local gateway, else production.

export function resolveAiUrl(): string {
  if (typeof window !== 'undefined') {
    const override = (window as { __AYLITH_AI_URL__?: string }).__AYLITH_AI_URL__;
    if (typeof override === 'string' && override.length > 0) return override;
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.lvh.me')) {
      return 'http://localhost:8410';
    }
  }
  return 'https://ai.aylith.com';
}
