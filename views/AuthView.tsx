import React from 'react';
import { motion } from 'motion/react';
import { supabase } from '../supabaseClient';
import { sendResetEmail } from '../passwordReset';

interface AuthViewProps {
  onAuthSuccess: () => void;
  /** Why an automatic sign-in from the NTP Superapp did not go through. */
  handoffError?: string;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess, handoffError }) => {
  const [mode, setMode] = React.useState<'signIn' | 'signUp' | 'forgot'>('signIn');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');

  // A failed hand-off drops the coach here; say why instead of showing a bare
  // form. Submitting clears it, as it does any other error.
  React.useEffect(() => {
    if (handoffError) setError(handoffError);
  }, [handoffError]);

  const changeMode = (next: 'signIn' | 'signUp' | 'forgot') => {
    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setError('');
    setNotice('');
  };

  const showExistingAccount = () => {
    setMode('signIn');
    setPassword('');
    setConfirmPassword('');
    setNotice('');
    setError('You already have an account. Sign in below, or use "Forgot password?" to set one — coaches who opened Analytics from the NTP Superapp have never chosen a password.');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setError('');
    setNotice('');

    if (mode === 'signUp') {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (password.length < 8) {
        setError('Use at least 8 characters for your password.');
        return;
      }
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        await sendResetEmail(supabase, email);
        // Always the same message: whether an address is registered is not
        // something an unauthenticated visitor should be able to probe.
        setNotice('If that email has an account, a reset link is on its way. Check your inbox and spam folder.');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not send the reset email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signIn') {
        const result = await supabase.auth.signInWithPassword({
          email: email.trim(), password,
        });
        if (result.error) throw result.error;
        onAuthSuccess();
        return;
      }

      const result = await supabase.auth.signUp({
        email: email.trim(), password,
        options: { emailRedirectTo: window.location.origin },
      });

      // Supabase may explicitly report a duplicate or return an obfuscated
      // user with no identities, depending on the project's Auth settings.
      if (result.error?.code === 'user_already_exists' ||
          result.error?.code === 'email_exists' ||
          (result.data.user?.identities?.length === 0 && !result.data.session)) {
        showExistingAccount();
        return;
      }
      if (result.error) throw result.error;
      if (result.data.session) {
        onAuthSuccess();
      } else {
        setPassword('');
        setConfirmPassword('');
        setNotice('Check your email to confirm your account, then sign in. If you already have an account, sign in instead.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not complete authentication.');
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
            <i className="fa-solid fa-tennis-ball text-white text-3xl" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">NTP Analytics</h1>
          <p className="text-white/80 text-xs mt-1 font-medium tracking-wide">Tennis Analytics & Tracking</p>
        </div>
        <div className="p-8">
          <div className="flex border-b border-[#C6C6C8]/30 mb-6" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={mode !== 'signUp'} onClick={() => changeMode('signIn')}
              className={`flex-1 pb-3 font-bold text-sm ${mode !== 'signUp' ? 'text-[#0F5CCE] border-b-[3px] border-[#0F5CCE]' : 'text-[#8E8E93]'}`}>
              Sign in
            </button>
            <button type="button" role="tab" aria-selected={mode === 'signUp'} onClick={() => changeMode('signUp')}
              className={`flex-1 pb-3 font-bold text-sm ${mode === 'signUp' ? 'text-[#0F5CCE] border-b-[3px] border-[#0F5CCE]' : 'text-[#8E8E93]'}`}>
              Sign up
            </button>
          </div>
          <p className="text-xs text-[#8E8E93] leading-relaxed mb-5">
            {mode === 'forgot'
              ? 'Enter your email and we will send you a link to set a new password.'
              : mode === 'signIn'
                ? 'Use your Tactical Drillboard account, or an account created here.'
                : 'This creates an account in the shared Tactical Drillboard project.'}
          </p>
          {error && <p role="alert" className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm mb-5">{error}</p>}
          {notice && <p role="status" className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-2xl text-sm mb-5">{notice}</p>}
          <form onSubmit={submit} className="space-y-5">
            <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider">
              Email address
              <input type="email" autoComplete="email" required value={email}
                onChange={event => setEmail(event.target.value)} disabled={loading}
                className="block mt-2 w-full px-4 py-3.5 bg-[#F2F2F7] rounded-2xl text-[#1C1C1E] text-base outline-none focus:ring-2 focus:ring-[#0F5CCE]" />
            </label>
            {mode !== 'forgot' && <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider">
              Password
              <input type="password" autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} required value={password}
                onChange={event => setPassword(event.target.value)} disabled={loading}
                className="block mt-2 w-full px-4 py-3.5 bg-[#F2F2F7] rounded-2xl text-[#1C1C1E] text-base outline-none focus:ring-2 focus:ring-[#0F5CCE]" />
            </label>}
            {mode === 'signUp' && <label className="block text-xs font-bold text-[#8E8E93] uppercase tracking-wider">
              Confirm password
              <input type="password" autoComplete="new-password" required value={confirmPassword}
                onChange={event => setConfirmPassword(event.target.value)} disabled={loading}
                className="block mt-2 w-full px-4 py-3.5 bg-[#F2F2F7] rounded-2xl text-[#1C1C1E] text-base outline-none focus:ring-2 focus:ring-[#0F5CCE]" />
            </label>}
            <button type="submit" disabled={loading}
              className="w-full py-4 bg-[#0F5CCE] text-white font-bold rounded-2xl disabled:opacity-50">
              {loading
                ? 'Please wait…'
                : mode === 'forgot' ? 'Send reset link'
                : mode === 'signIn' ? 'Sign in'
                : 'Create account'}
            </button>
          </form>
          {mode === 'signIn' && <p className="text-center text-xs text-[#8E8E93] mt-5">
            <button type="button" className="text-[#0F5CCE] font-bold underline" onClick={() => changeMode('forgot')}>
              Forgot password?
            </button>
          </p>}
          {mode === 'forgot' && <p className="text-center text-xs text-[#8E8E93] mt-5">
            <button type="button" className="text-[#0F5CCE] font-bold underline" onClick={() => changeMode('signIn')}>
              Back to sign in
            </button>
          </p>}
          {mode === 'signUp' && <p className="text-center text-xs text-[#8E8E93] mt-5">
            Already have an account?{' '}
            <button type="button" className="text-[#0F5CCE] font-bold underline" onClick={() => changeMode('signIn')}>Sign in instead</button>
          </p>}
        </div>
      </motion.div>
    </div>
  );
};
