/** Issuer library-api stamps on PIN and staff-badge desk JWTs (terminal_jwt.go's terminalIssuer). */
const TERMINAL_ISSUER = 'library-terminal';

/**
 * True when the access token is a shared-desk PIN or badge session rather than a personal sso
 * session. A desk token has no refresh token and no sso cookie behind it, so it stays stored and
 * the cookie session leaves it alone. Reads the unverified JWT payload: this picks a flow, it is
 * not a security check (library-api still validates every token).
 */
export function isTerminalSession(accessToken: string | null | undefined): boolean {
  if (!accessToken) return false;
  try {
    const part = accessToken.split('.')[1];
    if (!part) return false;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
    return (JSON.parse(json) as { iss?: string }).iss === TERMINAL_ISSUER;
  } catch {
    return false;
  }
}
