import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Signs a coach in when they arrive from the NTP Superapp's Analytics tile.
 *
 * The superapp mints a short-lived, HMAC-signed hand-off code and sends the
 * coach here as `?sso=<code>`. The `sso-redeem` edge function — shared with
 * Tactical Drillboard, which lives in this same Supabase project — verifies the
 * signature and returns a one-time token we exchange for a session. No password
 * crosses between the apps, and a coach arriving this way never sees a sign-up
 * form: the account is created on first arrival, matched by email.
 *
 * Coaches who came to Analytics on their own are untouched by this and keep
 * signing in normally.
 */

const SSO_PARAM = 'sso';

/**
 * Reads the hand-off code and strips it from the address bar, so a sign-in code
 * is never left sitting in history or copied out of a shared link.
 */
function takeSsoCode(): string | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get(SSO_PARAM);
  if (!code) return null;
  params.delete(SSO_PARAM);
  const query = params.toString();
  window.history.replaceState({}, '',
    window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
  return code;
}

// Taken once, as the module loads, so React's development double-render cannot
// let one pass see the code and the next find an empty address bar.
const handoffCode = takeSsoCode();

/** Whether this page load arrived from the superapp, so the UI can say so. */
export const hasSsoHandoff = handoffCode !== null;

/**
 * supabase-js reports a non-2xx edge function reply as an error and leaves
 * `data` null, so the function's own wording (expired link, wrong role) is only
 * reachable through the attached Response.
 */
async function readFunctionError(error: unknown, data: unknown, fallback: string): Promise<string> {
  const inline = (data as { error?: string } | null)?.error;
  if (inline) return inline;
  const context = (error as { context?: Response } | null)?.context;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.json();
      if (body && typeof body.error === 'string') return body.error;
    } catch {
      // Not a JSON body — fall back to the generic message below.
    }
  }
  return error instanceof Error ? error.message : fallback;
}

async function redeem(db: SupabaseClient, code: string): Promise<void> {
  const { data, error } = await db.functions.invoke('sso-redeem', { body: { code } });
  const tokenHash = (data as { token_hash?: string } | null)?.token_hash;
  if (error || !tokenHash) {
    throw new Error(await readFunctionError(error, data, 'That sign-in link was not accepted.'));
  }
  const { error: otpError } = await db.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (otpError) throw otpError;
}

let attempt: Promise<void> | null = null;
let spent = false;

/**
 * Turns the hand-off code into a session. Callers that arrive while the first
 * attempt is still running share its result; once it has settled — either way —
 * the code is done with, so a later sign-out does not replay it. Resolves
 * immediately when this page load carried no code.
 */
export function consumeSsoHandoff(db: SupabaseClient): Promise<void> {
  if (!handoffCode || spent) return Promise.resolve();
  if (!attempt) attempt = redeem(db, handoffCode).finally(() => { spent = true; });
  return attempt;
}
