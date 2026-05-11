import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, LogIn, Sparkles, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
  const { login, loginWithEmail, signupWithEmail } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password, name);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-base flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background aesthetics */}
      <div className="absolute inset-0 bg-theme-base z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-theme-primary/10 via-theme-base to-theme-base"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-theme-primary/30 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow object-delay-1000"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md z-10"
      >
        <div className="glassy-neumorphic rounded-3xl p-8 shadow-2xl border border-white/10 backdrop-blur-xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-theme-primary to-indigo-500 flex items-center justify-center mb-4 shadow-lg shadow-theme-primary/30">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">TriMatrix AI</h1>
            <p className="text-theme-muted mt-2 text-center text-sm">{isLogin ? 'Sign in' : 'Create an account'} to access your intelligent marketing suite</p>
          </div>

          <div className="space-y-6">
            <button 
              onClick={async () => {
                setError('');
                try {
                  await login();
                  navigate('/dashboard');
                } catch (err: any) {
                  setError(err.message || 'An error occurred during Google sign-in. This may be due to an adblocker or restricted network environment.');
                }
              }}
              className="w-full relative group overflow-hidden bg-white text-gray-900 font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center transition-all hover:bg-gray-100 shadow-lg shadow-white/5"
            >
              <div className="absolute inset-0 w-1/4 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12 group-hover:animate-shine"></div>
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.01v2.84C3.82 20.53 7.61 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.01C1.3 8.48 1 10.19 1 12s.3 3.52 1.01 4.93l3.83-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.61 1 3.82 3.47 2.01 7.07l3.83 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10"></div>
              <span className="text-xs font-medium text-theme-muted uppercase tracking-widest">or</span>
              <div className="h-px flex-1 bg-white/10"></div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative"
                  >
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="Full Name" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="email" 
                  placeholder="Email address" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="password" 
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all"
                />
              </div>

              {error && (
                <div className="text-rose-500 text-sm text-center bg-rose-500/10 py-2 rounded-lg border border-rose-500/20">
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-theme-primary hover:bg-theme-primary-hover border border-theme-primary text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-theme-primary/20 flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  isLogin ? 'Sign In with Email' : 'Create Account'
                )}
              </button>
            </form>

            <div className="text-center mt-4">
              <button 
                onClick={() => setIsLogin(!isLogin)} 
                className="text-theme-muted hover:text-white text-sm transition-colors"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
          
          <div className="mt-8 text-center text-xs text-theme-muted">
            By continuing, you agree to TriMatrix's <br/>
            <a href="#" className="text-theme-primary hover:underline">Terms of Service</a> and <a href="#" className="text-theme-primary hover:underline">Privacy Policy</a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
