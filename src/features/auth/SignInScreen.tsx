import { useState } from 'react';
import { useAuthStore } from './auth-store';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ToastViewport } from '../../components/ui/toast-viewport';
import { SynCatchLogo } from '../../components/SynCatchLogo';
import { Users, User, KeyRound, ArrowRight } from 'lucide-react';

export function SignInScreen() {
  const [activeTab, setActiveTab] = useState<'personal' | 'team'>('team');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const { loading, error, signIn, signUp, requestPasswordReset, clearError, setLocalMode } = useAuthStore();

  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!email || !password) return;

    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
    } catch {
      // Error is already exposed by the auth store.
    }
  };

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (isForgotPassword) {
      if (!email) return;
      try {
        await requestPasswordReset(email);
        setIsForgotPassword(false);
      } catch {
        // Error is already in store
      }
      return;
    }

    if (!email || !password) return;

    try {
      if (isSignUp) {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
    } catch {
      // Error is already in store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-md">
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <SynCatchLogo className="h-10 w-10" />
            <span>
              Syn<span style={{ color: '#3E8BFF' }}>Catch</span>
            </span>
          </h1>
          <p className="text-slate-400 text-sm">
            Focus Operating System & Venture Command Center
          </p>
        </div>

        {/* 2-Mode Primary Selector Card */}
        <div className="grid grid-cols-2 p-1.5 mb-6 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl">
          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`py-3 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'team'
                ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>Team Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`py-3 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'personal'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4 text-blue-400" />
            <span>Personal Focus</span>
          </button>
        </div>

        {/* Card Content based on Tab */}
        <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl space-y-5 backdrop-blur-md">
          {activeTab === 'team' ? (
            /* TEAM MODE GATEWAY */
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-11 h-11 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white pt-1">
                  Sign in for Team Hub
                </h3>
                <p className="text-xs text-slate-400">
                  Use your own account. After sign-in, create a room or request admin approval with an invite code.
                </p>
              </div>

              <form onSubmit={handleTeamSubmit} className="space-y-4 pt-2">
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Name</label>
                    <Input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      disabled={loading}
                      className="w-full"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Work email</label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    disabled={loading}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || !email || !password}
                  variant="primary"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-xl shadow-amber-500/20"
                >
                  <span>{loading ? 'Loading...' : isSignUp ? 'Create Account & Join Team' : 'Sign In to Team Hub'}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </form>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-xl text-xs">
                  {error}
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 text-center space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp((value) => !value);
                    clearError();
                  }}
                  disabled={loading}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {isSignUp ? 'Already have an account? Sign in' : 'New teammate? Create an account'}
                </button>
                <p className="text-[11px] text-slate-500">
                  Room codes request access; only an admin approval unlocks the room.
                </p>
              </div>
            </div>
          ) : (
            /* PERSONAL MODE SIGN IN */
            <div className="space-y-4">
              <form onSubmit={handlePersonalSubmit} className="space-y-4">
                {isSignUp && !isForgotPassword && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Name</label>
                    <Input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      disabled={loading}
                      className="w-full"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    disabled={loading}
                    className="w-full"
                  />
                </div>

                {!isForgotPassword && (
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="block text-xs font-medium text-slate-300">Password</label>
                      {!isSignUp && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(true);
                            clearError();
                          }}
                          disabled={loading}
                          className="text-[11px] text-slate-400 hover:text-slate-300 transition-colors"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      className="w-full"
                    />
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-xl text-xs">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !email || (!isForgotPassword && !password)}
                  variant="primary"
                  className="w-full text-xs font-bold py-2.5"
                >
                  {loading
                    ? 'Loading...'
                    : isForgotPassword
                      ? 'Send Reset Link'
                      : isSignUp
                        ? 'Create Account'
                        : 'Sign In'}
                </Button>
              </form>

              <div className="text-center">
                {isForgotPassword ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      clearError();
                    }}
                    disabled={loading}
                    className="text-slate-400 hover:text-slate-300 transition-colors text-xs"
                  >
                    Back to sign in
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      clearError();
                    }}
                    disabled={loading}
                    className="text-slate-400 hover:text-slate-300 transition-colors text-xs"
                  >
                    {isSignUp
                      ? 'Already have an account? Sign in'
                      : "Don't have an account? Create one"}
                  </button>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  onClick={() => setLocalMode(true)}
                  variant="secondary"
                  className="w-full border-slate-700 hover:bg-slate-800 text-slate-300 text-xs py-2"
                >
                  Instant Local Mode (No Account Required)
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ToastViewport />
    </div>
  );
}
