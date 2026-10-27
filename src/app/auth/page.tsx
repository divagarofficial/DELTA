'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DeltaLogo } from '@/components/brand/DeltaLogo';
import { useAuth } from '@/context/AuthContext';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function AuthPage() {
  const router = useRouter();
  const { signIn, signUp, availableDemoUsers, switchDemoUser, isConfigured } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    if (mode === 'signin') {
      const res = await signIn(email, password);
      if (res.error) {
        setErrorMsg(res.error);
        setIsSubmitting(false);
      } else {
        router.push('/');
      }
    } else {
      if (!username.trim() || !displayName.trim()) {
        setErrorMsg('Please provide a display name and username.');
        setIsSubmitting(false);
        return;
      }
      const res = await signUp(email, password, username, displayName);
      if (res.error) {
        setErrorMsg(res.error);
        setIsSubmitting(false);
      } else {
        router.push('/');
      }
    }
  };

  const handleSelectDemoUser = (userId: string) => {
    switchDemoUser(userId);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4 selection:bg-delta-500/20 selection:text-delta-600">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Logo */}
        <Link href="/" className="mb-6 flex flex-col items-center">
          <DeltaLogo size={44} />
        </Link>

        {/* Card */}
        <div className="w-full bg-card border border-border rounded-3xl shadow-xl p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {mode === 'signin' ? 'Welcome Back' : 'Create Delta Account'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {mode === 'signin'
                  ? 'Sign in to access your secure conversations.'
                  : 'Start communicating with speed and privacy.'}
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-delta-100 text-delta-800 dark:bg-delta-950 dark:text-delta-300">
              {isConfigured ? 'Supabase' : 'Demo Mode'}
            </span>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Display Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-muted-foreground absolute left-3" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full bg-muted text-foreground text-xs pl-9 pr-3 py-2.5 rounded-xl border border-transparent focus:border-border focus:bg-background focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Unique Username
                  </label>
                  <div className="relative flex items-center bg-muted rounded-xl px-3 border border-transparent focus-within:border-border focus-within:bg-background">
                    <span className="text-muted-foreground font-mono text-xs">@</span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) =>
                        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                      }
                      placeholder="priya_sharma"
                      className="w-full bg-transparent text-foreground text-xs py-2.5 pl-1 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Email Address or Username
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-muted-foreground absolute left-3" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com or @username"
                  className="w-full bg-muted text-foreground text-xs pl-9 pr-3 py-2.5 rounded-xl border border-transparent focus:border-border focus:bg-background focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-muted text-foreground text-xs pl-9 pr-3 py-2.5 rounded-xl border border-transparent focus:border-border focus:bg-background focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-delta-600 text-white font-bold text-xs hover:bg-delta-700 disabled:opacity-50 transition-all shadow-sm active:scale-98 flex items-center justify-center gap-1.5 mt-2"
            >
              <span>{mode === 'signin' ? 'Sign In to Delta' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setErrorMsg('');
              }}
              className="text-xs text-delta-600 hover:text-delta-700 font-semibold"
            >
              {mode === 'signin'
                ? "Don't have an account? Sign Up"
                : 'Already have an account? Sign In'}
            </button>
          </div>

          {/* Quick Demo Switcher */}
          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 text-center">
              One-Click Interactive Personas
            </p>
            <div className="grid grid-cols-2 gap-2">
              {availableDemoUsers.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectDemoUser(p.id)}
                  className="p-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-left text-xs transition-colors flex items-center gap-2"
                >
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-card shrink-0">
                    <img src={p.avatar_url || ''} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-foreground truncate">{p.display_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">@{p.username}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
