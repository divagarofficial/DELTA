'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MessagingWorkspace } from '@/components/layout/MessagingWorkspace';
import { DeltaLogo } from '@/components/brand/DeltaLogo';
import {
  Shield,
  Zap,
  PhoneCall,
  Sparkles,
  ArrowRight,
  Lock,
  Globe2,
  Users2,
  Radio,
  BarChart2,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { currentUser, isLoading } = useAuth();
  const [showLandingExplicit, setShowLandingExplicit] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background select-none">
        <div className="flex flex-col items-center gap-3">
          <DeltaLogo size={52} showText={false} />
          <p className="text-xs font-semibold text-muted-foreground animate-pulse">
            Connecting to Delta...
          </p>
        </div>
      </div>
    );
  }

  // If user has active session and didn't explicitly request landing page, render the workspace
  if (currentUser && !showLandingExplicit) {
    return <MessagingWorkspace />;
  }

  // Otherwise show the landing page
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-delta-500/20 selection:text-delta-600">
      {/* Navigation Header */}
      <header className="border-b border-border/80 bg-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <DeltaLogo size={36} />

          <div className="flex items-center gap-3">
            <Link
              href="/auth"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
            >
              Sign In
            </Link>
            <button
              onClick={() => setShowLandingExplicit(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-delta-600 text-white hover:bg-delta-700 shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>Open Web App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-16 sm:py-24 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-delta-50 dark:bg-delta-950 border border-delta-200 dark:border-delta-800 text-delta-700 dark:text-delta-300 text-xs font-semibold mb-6 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Delta v1.0 — Production-Oriented Messaging</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-3xl leading-[1.1] text-foreground">
          Everything connects. <br />
          <span className="bg-gradient-to-r from-delta-600 via-violet-500 to-purple-600 bg-clip-text text-transparent">
            Fast, private, and unified.
          </span>
        </h1>

        {/* Tagline */}
        <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          A high-performance modern messaging platform built to challenge WhatsApp Web and Telegram.
          Backed by PostgreSQL Row Level Security, WebRTC calling, Realtime sync, and original design.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => setShowLandingExplicit(false)}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-delta-600 text-white text-sm font-bold hover:bg-delta-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Launch Delta Web</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <Link
            href="/auth"
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-card border border-border text-foreground text-sm font-semibold hover:bg-muted shadow-xs transition-colors flex items-center justify-center"
          >
            Create Free Account
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left w-full">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-delta-100 dark:bg-delta-950 text-delta-600 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">
              Low-Latency Messaging
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Real-time messaging with Sent, Delivered, and Read receipts. Instant delivery, optimistic updates, and offline resilience.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">
              Row Level Security
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every query is isolated by PostgreSQL RLS. Non-members cannot read messages or receipts merely by guessing identifiers.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center mb-4">
              <PhoneCall className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">
              WebRTC Audio & Video
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Peer-to-peer 1-on-1 voice and video calling with live state signaling, camera switching, and mute controls.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 bg-card">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <DeltaLogo size={24} showText={false} />
            <span className="font-semibold text-foreground">Delta Platform</span>
            <span>• Everything connects.</span>
          </div>
          <p>© 2026 Delta. Engineered for speed, privacy, and reliability.</p>
        </div>
      </footer>
    </div>
  );
}
