'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  CircleDot,
  Radio,
  Users,
  Settings as SettingsIcon,
  Moon,
  Sun,
  LogOut,
  UserCheck,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { DeltaLogoWithoutText } from '@/components/brand/DeltaLogo';
import { useAuth } from '@/context/AuthContext';
import { useMessaging } from '@/context/MessagingContext';
import { getInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface NavigationRailProps {
  onOpenSettings: () => void;
}

export function NavigationRail({ onOpenSettings }: NavigationRailProps) {
  const router = useRouter();
  const { currentUser, signOut, switchDemoUser, availableDemoUsers, isDemoMode, isConfigured } = useAuth();
  const { activeTab, setActiveTab, conversations, statuses } = useMessaging();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  // Toggle dark mode
  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      root.classList.add('dark');
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
      badge: unreadTotal > 0 ? unreadTotal : null,
    },
    {
      id: 'status' as const,
      label: 'Status',
      icon: CircleDot,
      hasDot: hasUnseenStatus,
    },
    {
      id: 'channels' as const,
      label: 'Channels',
      icon: Radio,
    },
    {
      id: 'communities' as const,
      label: 'Communities',
      icon: Users,
    },
  ];

  return (
    <aside className="w-[68px] sm:w-[72px] shrink-0 border-r border-border bg-card flex flex-col items-center justify-between py-4 select-none z-20">
      {/* Top Branding & Nav */}
      <div className="flex flex-col items-center w-full gap-6">
        {/* Delta Logo */}
        <button
          onClick={() => setActiveTab('chats')}
          aria-label="Delta Home"
          className="p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
        >
          <DeltaLogoWithoutText size={40} />
        </button>

        {/* Navigation Tabs */}
        <nav className="flex flex-col items-center gap-2 w-full px-2" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-label={item.label}
                title={item.label}
                className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-delta-100 text-delta-700 dark:bg-delta-950 dark:text-delta-300 font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
                {item.badge ? (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-delta-600 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center shadow-sm">
                    {item.badge}
                  </span>
                ) : item.hasDot ? (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-delta-500 rounded-full ring-2 ring-card" />
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-col items-center gap-3 w-full px-2">
        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Settings & Privacy"
          aria-label="Settings"
          className="w-11 h-11 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
          className="w-11 h-11 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Current user avatar with Persona switcher popover */}
        <div className="relative mt-1">
          <button
            onClick={() => setShowPersonaMenu((prev) => !prev)}
            aria-label="User Profile and Persona Switcher"
            title={`${currentUser?.display_name} (@${currentUser?.username})`}
            className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-border hover:ring-delta-500 transition-all focus:outline-none flex items-center justify-center bg-delta-100 text-delta-800 font-bold text-xs"
          >
            {currentUser?.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{getInitials(currentUser?.display_name || 'U')}</span>
            )}
          </button>

          {/* Persona & Account dropdown */}
          {showPersonaMenu && (
            <div className="absolute left-14 bottom-0 w-64 bg-card border border-border rounded-2xl shadow-xl p-3 z-50 text-sm animate-fade-in">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-border">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(currentUser?.display_name || '')
                  )}
                </div>
                <div className="truncate flex-1">
                  <p className="font-semibold text-foreground truncate">{currentUser?.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">@{currentUser?.username}</p>
                </div>
              </div>

              {/* Mode badge */}
              <div className="my-2.5 px-2.5 py-1.5 rounded-lg bg-muted text-xs flex items-center justify-between">
                <span className="font-medium text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-delta-600" />
                  {isConfigured ? 'Supabase Live' : 'Delta Demo Mode'}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-card font-semibold text-foreground">
                  Active
                </span>
              </div>

              {/* Switch persona option */}
              <div className="space-y-1 mb-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-1">
                  Switch Active Persona
                </p>
                {availableDemoUsers.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => {
                      switchDemoUser(profile.id);
                      setShowPersonaMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                      currentUser?.id === profile.id
                        ? 'bg-delta-50 text-delta-700 dark:bg-delta-950 dark:text-delta-300 font-semibold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5 opacity-60" />
                    <span className="truncate flex-1">{profile.display_name}</span>
                    {currentUser?.id === profile.id && <span className="text-[10px] text-delta-600">●</span>}
                  </button>
                ))}
              </div>

              {/* Sign out */}
              <button
                onClick={async () => {
                  await signOut();
                  setShowPersonaMenu(false);
                  router.push('/auth');
                }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-xs text-destructive hover:bg-destructive/10 transition-colors pt-2 border-t border-border font-medium"
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
