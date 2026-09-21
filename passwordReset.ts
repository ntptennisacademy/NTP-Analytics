import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Forgotten-password recovery.
 *
 * This matters more than usual here: coaches who arrive from the NTP Superapp
 * tile get an account created for them by the `sso-redeem` edge function with a
 * random password nobody ever sees. Without this flow, one of them opening
 * Analytics directly would be told they already have an account and have no way
 * to get into it.
 *
 * The client uses supabase-js's default implicit flow, so a recovery link comes
 * back as `#access_token=...&type=recovery`. supabase-js consumes that fragment
 * during start-up — and signs the user in while doing so — so the marker is
 * read at module load, before it disappears. The App also listens for the
 * PASSWORD_RECOVERY event as a second signal.
 */

const RECOVERY_MARKER = /(?:^|[#&?])type=recovery(?:&|$)/;

export const arrivedForPasswordReset =
  RECOVERY_MARKER.test(window.location.hash) ||
  RECOVERY_MARKER.test(window.location.search);

/** Sends the reset email. Resolves even if the address has no account, because
 *  telling a stranger which emails are registered is not our business. */
export async function sendResetEmail(db: SupabaseClient, email: string): Promise<void> {
  const { error } = await db.auth.resetPasswordForEmail(email.trim(), {
    // Must be listed in the project's Auth redirect allowlist, or the link in
    // the email will bounce the coach to the site root with no token.
    redirectTo: window.location.origin,
  });
  if (error) throw error;
}

export async function setNewPassword(db: SupabaseClient, password: string): Promise<void> {
  const { error } = await db.auth.updateUser({ password });
  if (error) throw error;
}

/** Clears the recovery fragment so a refresh does not re-open the reset form. */
export function clearRecoveryMarker(): void {
  window.history.replaceState({}, '', window.location.pathname + window.location.search);
}
