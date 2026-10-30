'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  CircleDot,
  Radio,
  Users,
  Briefcase,
  Settings as SettingsIcon,
  Moon,
  Sun,
  LogOut,
  UserCheck,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Satellite,
} from 'lucide-react';
import { DeltaLogoWithoutText } from '@/components/brand/DeltaLogo';
import { useAuth } from '@/context/AuthContext';
import { useMessaging } from '@/context/MessagingContext';
import { getInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface NavigationRailProps {
  onOpenSettings: () => void;
}

export function NavigationRail({ onOpenSettings }: NavigationRailProps) {
  const router = useRouter();
  const { currentUser, signOut, switchDemoUser, availableDemoUsers, isDemoMode, isConfigured } = useAuth();
  const { activeTab, setActiveTab, conversations, statuses, isSatelliteMode, setShowSatelliteRadar } = useMessaging();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  // Initialize and persist dark mode
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('delta_theme');
      if (stored === 'dark') {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      } else if (stored === 'light') {
        document.documentElement.classList.remove('dark');
        setIsDarkMode(false);
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
      }
    }
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      localStorage.setItem('delta_theme', 'light');
      setIsDarkMode(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('delta_theme', 'dark');
      setIsDarkMode(true);
    }
  };

  // Total unread conversations count
  const unreadTotal = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const hasUnseenStatus = statuses.some((s) => !s.has_viewed && s.user_id !== currentUser?.id);

  const navItems = [
    {
      id: 'chats' as const,
      label: 'Chats',
      icon: MessageSquare,
      badge: unreadTotal > 0 ? String(unreadTotal) : null,
    },
    {
      id: 'status' as const,
      label: 'Status',
      icon: CircleDot,
      hasDot: hasUnseenStatus,
      badge: null,
    },
    {
      id: 'channels' as const,
      label: 'Channels',
      icon: Radio,
      badge: null,
    },
    {
      id: 'communities' as const,
      label: 'Communities',
      icon: Users,
      badge: null,
    },
    {
      id: 'business' as const,
      label: 'Delta Business ($0 API)',
      icon: Briefcase,
      badge: 'FREE',
    },
  ];

  return (
    <aside className="w-[68px] sm:w-[72px] shrink-0 border-r border-border/80 bg-card/95 backdrop-blur-xl flex flex-col items-center justify-between py-4 select-none z-20 shadow-xs">
      {/* Top Branding & Nav */}
      <div className="flex flex-col items-center w-full gap-5">
        {/* Delta Logo with ambient glow on hover */}
        <button
          onClick={() => setActiveTab('chats')}
          aria-label="Delta Home"
          className="p-1 focus:outline-none group relative transition-transform duration-200 active:scale-95"
        >
          <div className="absolute inset-0 rounded-2xl bg-delta-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          <DeltaLogoWithoutText size={42} />
        </button>

        {/* Navigation Tabs */}
        <nav className="flex flex-col items-center gap-2.5 w-full px-2" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div key={item.id} className="relative w-full flex items-center justify-center">
                {/* Active capsule indicator on edge */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-delta-500 to-violet-600 rounded-r-full shadow-sm" />
                )}

                <button
                  onClick={() => setActiveTab(item.id)}
                  aria-label={item.label}
                  title={item.label}
                  className={`group relative w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-200 active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-tr from-delta-600 to-violet-600 text-white shadow-md shadow-delta-600/25 ring-1 ring-white/20'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-105 stroke-[2.4]' : 'group-hover:scale-110 stroke-[2]'}`} />

                  {item.badge ? (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-extrabold rounded-full min-w-[19px] text-center shadow-md ring-2 ring-card animate-pulse">
                      {item.badge}
                    </span>
                  ) : item.hasDot ? (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-delta-400 rounded-full ring-2 ring-card" />
                  ) : null}
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-col items-center gap-2.5 w-full px-2">
        {/* Satellite Direct-to-Cell Radar Trigger */}
        <button
          onClick={() => setShowSatelliteRadar(true)}
          title={isSatelliteMode ? 'Direct-to-Cell Active: Connected to LEO Starlink' : 'Satellite Direct-to-Cell Sky Radar'}
          aria-label="Satellite Sky Radar"
          className={`relative w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-200 ${
            isSatelliteMode
              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-500 shadow-md shadow-amber-500/10'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
          }`}
        >
          <Satellite className={`w-5 h-5 ${isSatelliteMode ? 'animate-pulse' : ''}`} />
          {isSatelliteMode && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-card animate-ping" />
          )}
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Settings & Privacy"
          aria-label="Settings"
          className="w-11 h-11 flex items-center justify-center rounded-2xl text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all duration-200 hover:rotate-45"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
          className="w-11 h-11 flex items-center justify-center rounded-2xl text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all duration-200"
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-amber-400 animate-spin-slow transition-transform hover:rotate-90 duration-300" />
          ) : (
            <Moon className="w-5 h-5 hover:-rotate-12 transition-transform duration-300" />
          )}
        </button>

        {/* Current user avatar with Persona switcher popover */}
        <div className="relative mt-1">
          <button
            onClick={() => setShowPersonaMenu((prev) => !prev)}
            aria-label="User Profile and Persona Switcher"
            title={`${currentUser?.display_name} (@${currentUser?.username})`}
            className="group relative w-11 h-11 rounded-full overflow-hidden ring-2 ring-border hover:ring-delta-500 transition-all focus:outline-none flex items-center justify-center bg-delta-100 text-delta-800 font-bold text-xs shadow-xs"
          >
            {currentUser?.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.display_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <span>{getInitials(currentUser?.display_name || 'U')}</span>
            )}
            {/* Live presence indicator dot */}
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-card" />
          </button>

          {/* Persona & Account dropdown */}
          {showPersonaMenu && (
            <div className="absolute left-16 bottom-0 w-72 bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-3 z-50 text-sm animate-fade-in reaction-bar-shadow">
              <div className="flex items-center gap-3 pb-3 border-b border-border/70">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-border">
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(currentUser?.display_name || '')
                  )}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-1 ring-card" />
                </div>
                <div className="truncate flex-1">
                  <p className="font-bold text-foreground truncate leading-tight">{currentUser?.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">@{currentUser?.username}</p>
                </div>
              </div>

              {/* Mode badge */}
              <div className="my-2.5 px-3 py-1.5 rounded-xl bg-muted/60 text-xs flex items-center justify-between border border-border/50">
                <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-delta-600" />
                  {isConfigured ? 'Supabase Connected' : 'Delta Demo Sandbox'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-delta-50 dark:bg-delta-950 text-delta-700 dark:text-delta-300 font-bold border border-delta-200 dark:border-delta-800">
                  Active
                </span>
              </div>

              {/* Switch account option (if multiple registered accounts exist on this browser) */}
              {availableDemoUsers.length > 1 && (
                <div className="space-y-1 mb-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 pt-1">
                    Switch Account
                  </p>
                  {availableDemoUsers.map((profile) => {
                    const isCurrent = currentUser?.id === profile.id;
                    return (
                      <button
                        key={profile.id}
                        onClick={() => {
                          switchDemoUser(profile.id);
                          setShowPersonaMenu(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-all ${
                          isCurrent
                            ? 'bg-delta-50 text-delta-700 dark:bg-delta-950 dark:text-delta-300 font-bold border border-delta-200 dark:border-delta-800'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-muted shrink-0 text-[10px] flex items-center justify-center font-bold">
                          {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            getInitials(profile.display_name)
                          )}
                        </div>
                        <span className="truncate flex-1">{profile.display_name}</span>
                        {isCurrent && (
                          <span className="w-2 h-2 rounded-full bg-delta-600 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Sign out */}
              <button
                onClick={async () => {
                  await signOut();
                  setShowPersonaMenu(false);
                  router.push('/auth');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs text-destructive hover:bg-destructive/10 transition-colors pt-2.5 border-t border-border/70 font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
