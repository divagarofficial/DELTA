'use client';

import React, { useState } from 'react';
import {
  X,
  User,
  Shield,
  Bell,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Save,
  Radio,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PrivacySetting } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { currentUser, updateProfile, isConfigured, isDemoMode } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'notifications' | 'database'>('profile');

  // Profile form state
  const [displayName, setDisplayName] = useState(currentUser?.display_name || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [biography, setBiography] = useState(currentUser?.biography || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone_number || '');
  const [isSaved, setIsSaved] = useState(false);

  // Privacy state
  const [lastSeen, setLastSeen] = useState<PrivacySetting>(currentUser?.privacy_last_seen || 'everyone');
  const [readReceipts, setReadReceipts] = useState<boolean>(currentUser?.privacy_read_receipts ?? true);
  const [profilePhoto, setProfilePhoto] = useState<PrivacySetting>(currentUser?.privacy_profile_photo || 'everyone');

  // Notification state
  const [inAppSounds, setInAppSounds] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = async () => {
    await updateProfile({
      display_name: displayName,
      username: username,
      biography: biography,
      phone_number: phoneNumber,
      privacy_last_seen: lastSeen,
      privacy_read_receipts: readReceipts,
      privacy_profile_photo: profilePhoto,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setBrowserNotifications(true);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold text-base text-foreground">Settings & Privacy</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-border bg-muted/30 px-3 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'profile' as const, label: 'Profile', icon: User },
            { id: 'privacy' as const, label: 'Privacy', icon: Shield },
            { id: 'notifications' as const, label: 'Notifications', icon: Bell },
            { id: 'database' as const, label: 'DevOps & Backend', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-delta-600 text-delta-600'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 text-xs">
          {/* 1. Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-muted text-foreground text-xs px-3 py-2 rounded-xl border border-transparent focus:border-border focus:bg-background focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-muted-foreground block mb-1">
                  Unique Delta Username
                </label>
                <div className="flex items-center bg-muted rounded-xl px-3 border border-transparent focus-within:border-border focus-within:bg-background">
                  <span className="text-muted-foreground font-mono">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="w-full bg-transparent text-foreground text-xs py-2 pl-1 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-muted-foreground block mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-muted text-foreground text-xs px-3 py-2 rounded-xl border border-transparent focus:border-border focus:bg-background focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-muted-foreground block mb-1">
                  Biography / Status
                </label>
                <textarea
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  rows={2}
                  className="w-full bg-muted text-foreground text-xs px-3 py-2 rounded-xl border border-transparent focus:border-border focus:bg-background focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-emerald-600 font-bold">
                  {isSaved && '✓ Changes saved successfully'}
                </span>
                <button
                  onClick={handleSaveProfile}
                  className="flex items-center gap-1.5 px-4 py-2 bg-delta-600 text-white rounded-xl font-bold hover:bg-delta-700 shadow-sm transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Profile
                </button>
              </div>
            </div>
          )}

          {/* 2. Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Last Seen & Presence
                </label>
                <p className="text-muted-foreground text-[11px] mb-2">
                  Who can see when you were last online
                </p>
                <select
                  value={lastSeen}
                  onChange={(e) => setLastSeen(e.target.value as PrivacySetting)}
                  className="w-full bg-muted text-foreground text-xs p-2 rounded-xl border border-transparent focus:border-border focus:outline-none"
                >
                  <option value="everyone">Everyone</option>
                  <option value="contacts">My Contacts</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <span className="font-semibold text-foreground block">
                    Read Receipts
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    If turned off, you will neither send nor receive read receipts (blue double checkmarks).
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={readReceipts}
                  onChange={(e) => setReadReceipts(e.target.checked)}
                  className="w-4 h-4 rounded text-delta-600 focus:ring-delta-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-border">
                <label className="font-semibold text-foreground block mb-1">
                  Profile Photo Visibility
                </label>
                <select
                  value={profilePhoto}
                  onChange={(e) => setProfilePhoto(e.target.value as PrivacySetting)}
                  className="w-full bg-muted text-foreground text-xs p-2 rounded-xl border border-transparent focus:border-border focus:outline-none"
                >
                  <option value="everyone">Everyone</option>
                  <option value="contacts">My Contacts</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-delta-600 text-white rounded-xl font-bold hover:bg-delta-700 shadow-sm"
                >
                  Update Privacy
                </button>
              </div>
            </div>
          )}

          {/* 3. Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground block">
                    In-App Audio Chimes
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    Play soft chimes for incoming messages and call rings.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={inAppSounds}
                  onChange={(e) => setInAppSounds(e.target.checked)}
                  className="w-4 h-4 rounded text-delta-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div>
                  <span className="font-semibold text-foreground block">
                    Browser Desktop Notifications
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    Show alerts when Delta is running in a background tab.
                  </span>
                </div>
                <button
                  onClick={requestNotificationPermission}
                  className="px-3 py-1.5 rounded-xl bg-delta-50 dark:bg-delta-950 text-delta-600 font-bold hover:bg-delta-100"
                >
                  {browserNotifications ? 'Enabled' : 'Request Permission'}
                </button>
              </div>
            </div>
          )}

          {/* 4. DevOps & Backend Architecture Tab */}
          {activeTab === 'database' && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-xl border border-border bg-surface-subtle dark:bg-surface-dark space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-delta-600" />
                    Supabase PostgreSQL Backend
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isConfigured
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {isConfigured ? 'Connected (Live)' : 'Interactive Demo Mode'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {isConfigured
                    ? 'Connected to live Supabase project. Queries persist to PostgreSQL and Realtime broadcast is active.'
                    : 'Running in Standalone Demo Mode with local persistence. To connect to your Supabase project, provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'}
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider block">
                  Security & Architecture Checklist
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Row Level Security (RLS) configured on all tables</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>WebRTC STUN Signaling ready for 1-to-1 audio/video</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Strict database authorization boundaries via is_conversation_member</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Progressive Web App (PWA) installable manifest ready</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
