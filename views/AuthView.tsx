import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../supabaseClient';

interface AuthViewProps {
  onAuthSuccess: (sessionUser: any) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    if (!email || !password) {
      setErrorMsg('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    if (!isLogin) {
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password should be at least 6 characters.');
        setLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        // Handle Login flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }

        if (data?.user) {
          // Check if profile exists and represents an approved user
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_approved')
            .eq('id', data.user.id)
            .maybeSingle(); // maybeSingle handles case where table exists but row is missing

          if (profileError) {
            console.error('Profile fetch error:', profileError);
            // If the table doesn't exist or has issue, let's create a pending profile row for them
            try {
              await supabase.from('profiles').upsert({
                id: data.user.id,
                email: data.user.email,
                is_approved: false
              });
            } catch (upsertErr) {
              console.error('Failed to auto-upsert profile:', upsertErr);
            }
            
            // Block since is_approved is not confirmed
            await supabase.auth.signOut();
            setErrorMsg('Waiting for admin approval.');
            setLoading(false);
            return;
          }

          // Case 1: Profile doesn't exist yet (or exists but is_approved is null/false)
          if (!profile) {
            // Write pending profile row
            try {
              await supabase.from('profiles').upsert({
                id: data.user.id,
                email: data.user.email,
                is_approved: false
              });
            } catch (upsertErr) {
              console.error('Failed to write profile row on login encounter:', upsertErr);
            }

            await supabase.auth.signOut();
            setErrorMsg('Waiting for admin approval.');
            setLoading(false);
            return;
          }

          // Case 2: profile has is_approved = false
          if (!profile.is_approved) {
            await supabase.auth.signOut();
            setErrorMsg('Waiting for admin approval.');
            setLoading(false);
            return;
          }

          // Step 3: Success! Approved!
          onAuthSuccess(data.user);
        }
      } else {
        // Handle Registration flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });

        if (error) {
          setErrorMsg(error.message);
          setLoading(false);
          return;
        }

        if (data?.user) {
          // Upsert the profiles table with is_approved = false, keeping it as pending approval
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: data.user.email,
              is_approved: false,
              full_name: fullName || null
            });
          } catch (profileError) {
            console.error('Failed to write profile during signup:', profileError);
          }

          // Sign out immediately so we don't count them as logged in
          await supabase.auth.signOut();

          setSuccessMsg('Registration successful! Your default account status is "pending approval". Waiting for admin approval.');
          
          // Clear inputs
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setFullName('');
          setIsLogin(true);
        } else {
          setSuccessMsg('Registration submitted. Plase sign in once approved.');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      console.error('Authentication process failed:', err);
      const isFetchError = err?.message?.toLowerCase().includes('fetch') || err?.message?.toLowerCase().includes('network') || !navigator.onLine;
      if (isFetchError) {
        setErrorMsg('Network connectivity issue ("Failed to fetch"). The centralized database is currently unreachable. You can continue securely in Offline Sandbox Mode below.');
      } else {
        setErrorMsg(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-[#C6C6C8]/20"
      >
        {/* Decorative Header Banner */}
        <div className="bg-[#0F5CCE] p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-12 -translate-y-12"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -translate-x-8 translate-y-8"></div>
          
          <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-4 backdrop-blur-md">
            <i className="fa-solid fa-tennis-ball text-white text-3xl animate-pulse"></i>
          </div>
          
          <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">
            NTP Analytics
          </h1>
          <p className="text-white/80 text-xs mt-1 font-medium tracking-wide">
            Tennis Analytics & Tracking
          </p>
        </div>

        <div className="p-8">
          <div className="flex border-b border-[#C6C6C8]/30 mb-8 pb-3">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 text-center font-bold text-sm transition-all pb-2 relative ${
                isLogin ? 'text-[#0F5CCE]' : 'text-[#8E8E93]'
              }`}
            >
              Sign In
              {isLogin && (
                <motion.div 
                  layoutId="activeTabUnderline" 
                  className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0F5CCE] rounded-full mx-auto w-1/2" 
                />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 text-center font-bold text-sm transition-all pb-2 relative ${
                !isLogin ? 'text-[#0F5CCE]' : 'text-[#8E8E93]'
              }`}
            >
              Register
              {!isLogin && (
                <motion.div 
                  layoutId="activeTabUnderline" 
                  className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0F5CCE] rounded-full mx-auto w-1/2" 
                />
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-semibold mb-6 flex items-start gap-2.5 shadow-sm"
              >
                <i className="fa-solid fa-triangle-exclamation mt-0.5 text-red-500"></i>
                <div className="flex-1">
                  <p className="font-bold">Access Blocked</p>
                  <p className="mt-0.5 text-red-600 font-medium leading-relaxed">{errorMsg}</p>
                </div>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-semibold mb-6 flex items-start gap-2.5 shadow-sm"
              >
                <i className="fa-solid fa-circle-check mt-0.5 text-emerald-600"></i>
                <div className="flex-1">
                  <p className="font-bold">Status Update</p>
                  <p className="mt-0.5 text-emerald-700 font-medium leading-relaxed">{successMsg}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="block text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider pl-1">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93]">
                    <i className="fa-solid fa-user"></i>
                  </span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    disabled={loading}
                    className="w-full pl-11 pr-4 py-3.5 bg-[#F2F2F7] border border-transparent rounded-2xl text-[#1C1C1E] font-medium outline-none transition-all placeholder-[#8E8E93]/60 focus:bg-white focus:border-[#0F5CCE]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider pl-1">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93]">
                  <i className="fa-solid fa-envelope"></i>
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3.5 bg-[#F2F2F7] border border-transparent rounded-2xl text-[#1C1C1E] font-medium outline-none transition-all placeholder-[#8E8E93]/60 focus:bg-white focus:border-[#0F5CCE]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider pl-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93]">
                  <i className="fa-solid fa-lock"></i>
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3.5 bg-[#F2F2F7] border border-transparent rounded-2xl text-[#1C1C1E] font-medium outline-none transition-all placeholder-[#8E8E93]/60 focus:bg-white focus:border-[#0F5CCE]"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="block text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider pl-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93]">
                    <i className="fa-solid fa-shield-halved"></i>
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="w-full pl-11 pr-4 py-3.5 bg-[#F2F2F7] border border-transparent rounded-2xl text-[#1C1C1E] font-medium outline-none transition-all placeholder-[#8E8E93]/60 focus:bg-white focus:border-[#0F5CCE]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-4 bg-[#0F5CCE] text-white font-bold rounded-2xl shadow-lg shadow-[#0F5CCE]/20 hover:bg-[#0d50b5] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? (
                <i className="fa-solid fa-spinner animate-spin text-lg"></i>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Register Account'}</span>
                  <i className="fa-solid fa-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          {isLogin && (
            <div className="mt-6 text-center">
              <p className="text-xs text-[#8E8E93] font-medium">
                Tip: Default account status for new registrations is <span className="font-bold text-[#1C1C1E]">pending approval</span> until authorized by an administrator.
              </p>
            </div>
          )}

          {(import.meta.env.DEV || 
            window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' || 
            window.location.hostname.includes('ais-dev-') || 
            window.location.hostname.includes('ais-pre-')) && (
            <div className="mt-8 pt-6 border-t border-[#C6C6C8]/30 flex flex-col gap-3 font-sans">
              <button
                type="button"
                onClick={() => {
                  onAuthSuccess({
                    id: 'guest_user',
                    email: 'offline.user@ntpanalytics.local',
                    full_name: 'Guest Player',
                    is_guest: true
                  });
                }}
                className="w-full py-3 bg-white border border-[#C6C6C8]/40 hover:border-[#0F5CCE] text-[#1C1C1E] font-bold rounded-2xl hover:bg-[#F2F2F7] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 text-xs uppercase tracking-wider shadow-sm"
              >
                <i className="fa-solid fa-wifi-slash text-[#8E8E93]"></i>
                <span>Use Offline Sandbox Mode</span>
              </button>
              <p className="text-[10px] text-center text-[#8E8E93] font-medium leading-relaxed">
                Facing connection blockages or "Failed to fetch"? Sandbox mode enables full local statistics keeping saved securely in your browser's local storage.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
