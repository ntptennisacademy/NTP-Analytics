import React from 'react';
import { motion } from 'motion/react';
import { supabase } from '../supabaseClient';
import { setNewPassword, clearRecoveryMarker } from '../passwordReset';

interface ResetPasswordViewProps {
  /** Called once a new password is saved and the session is usable. */
  onDone: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onDone }) => {
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }
    setLoading(true);
    try {
      await setNewPassword(supabase, password);
      // The recovery link already signed them in, so they go straight through.
      clearRecoveryMarker();
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not set your new password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-[#C6C6C8]/20"
      >
        <div className="bg-[#0F5CCE] p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <i className="fa-solid fa-key text-white text-3xl" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Choose a password</h1>
          <p className="text-white/80 text-xs mt-1 font-medium tracking-wide">NTP Analytics</p>
        </div>
        <div className="p-8">
          <p className="text-xs text-[#8E8E93] leading-relaxed mb-5">
            Set a password for your account. You can keep opening Analytics from the
            NTP Superapp as well — this just lets you sign in directly too.
          </p>
          {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm mb-5">{error}</p>}
          <form onSubmit={submit} className="space-y-5">
            <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider">
              New password
              <input type="password" autoComplete="new-password" required value={password}
                onChange={event => setPassword(event.target.value)} disabled={loading}
                className="block mt-2 w-full px-4 py-3.5 bg-[#F2F2F7] rounded-2xl text-[#1C1C1E] text-base outline-none focus:ring-2 focus:ring-[#0F5CCE]" />
            </label>
            <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider">
              Confirm password
              <input type="password" autoComplete="new-password" required value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)} disabled={loading}
                className="block mt-2 w-full px-4 py-3.5 bg-[#F2F2F7] rounded-2xl text-[#1C1C1E] text-base outline-none focus:ring-2 focus:ring-[#0F5CCE]" />
            </label>
            <button type="submit" disabled={loading}
              className="w-full py-4 bg-[#0F5CCE] text-white font-bold rounded-2xl disabled:opacity-50">
              {loading ? 'Saving…' : 'Save password'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
