import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QrCode, Lock, Mail, User, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LoginSignup() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ADMIN',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await signup(formData);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email, password) => {
    setFormData((prev) => ({
      ...prev,
      email,
      password,
    }));
    setIsLogin(true);
    setError('');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950">
      <div className="w-full max-w-md">
        {/* Brand Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-700 via-brand-600 to-indigo-500 shadow-xl shadow-brand-600/30 mb-4 ring-4 ring-brand-500/10">
            <QrCode className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Event & Workshop <span className="text-brand-400">QR Check-In</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Authorized Organizer & Scanner Gatekeeper Portal
          </p>
        </div>

        {/* Auth Box */}
        <div className="rounded-2xl border border-navy-800 bg-navy-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-navy-950 p-1 mb-6 border border-navy-800">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                isLogin
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                !isLogin
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Organizer Signup
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
              <span className="shrink-0 text-rose-400 font-bold">!</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name / Organization
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. ACM Student Chapter"
                    className="w-full rounded-xl border border-navy-700 bg-navy-950/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Staff / Organizer Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@eventqr.com"
                  className="w-full rounded-xl border border-navy-700 bg-navy-950/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-navy-700 bg-navy-950/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 hover:from-brand-500 hover:to-indigo-500 transition active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Sign In to Dashboard' : 'Create Organizer Account'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Fill */}
          <div className="mt-6 pt-5 border-t border-navy-800">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 text-center mb-3 flex items-center justify-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand-400" />
              Quick 1-Click Demo Logins
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin@eventqr.com', 'Admin@123')}
                className="p-2.5 rounded-xl border border-brand-800/60 bg-brand-950/40 hover:bg-brand-900/60 text-left transition group"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-300 group-hover:text-white">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
                  Lead Admin
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">admin@eventqr.com</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemo('staff@eventqr.com', 'Staff@123')}
                className="p-2.5 rounded-xl border border-navy-700 bg-navy-850 hover:bg-navy-800 text-left transition group"
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 group-hover:text-white">
                  <QrCode className="h-3.5 w-3.5 text-indigo-400" />
                  Gate Staff
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">staff@eventqr.com</div>
              </button>
            </div>
          </div>
        </div>

        {/* Attendee Quick Link */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-400">
            Are you a student or attendee?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-brand-400 hover:text-brand-300 font-semibold underline underline-offset-4"
            >
              Register for an Event
            </button>
            {' or '}
            <button
              onClick={() => navigate('/my-ticket')}
              className="text-brand-400 hover:text-brand-300 font-semibold underline underline-offset-4"
            >
              Find Your QR Pass
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
