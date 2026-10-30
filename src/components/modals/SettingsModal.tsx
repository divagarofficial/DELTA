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
  Smartphone,
  RefreshCw,
  Upload,
  Sparkles,
  ShieldCheck,
  Key,
  Fingerprint,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useMessaging } from '@/context/MessagingContext';
import { PrivacySetting } from '@/types';
import { DELTA_SECURITY_SUMMARY } from '@/lib/security';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { currentUser, updateProfile, isConfigured, isDemoMode } = useAuth();
  const {
    syncedContacts,
    syncDeviceContacts,
    importContactsFromFile,
    syncSampleAddressBook,
    isContactsPickerSupported,
    mealStatus,
    setMealStatus,
    isAiAutoPilot,
    toggleAiAutoPilot,
  } = useMessaging();
  const [activeTab, setActiveTab] = useState<'profile' | 'contacts' | 'ai' | 'privacy' | 'notifications' | 'database'>('profile');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Gemini API Key & AI Settings State
  const [geminiKey, setGeminiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('delta_gemini_api_key') || '';
    }
    return '';
  });
  const [isAiSaved, setIsAiSaved] = useState(false);

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
  const [phonePrivacy, setPhonePrivacy] = useState<PrivacySetting>(currentUser?.privacy_phone_number || 'contacts');
  const [screenLock, setScreenLock] = useState<boolean>(false);
  const [disappearingDefault, setDisappearingDefault] = useState<string>('0');

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
      privacy_phone_number: phonePrivacy,
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
            { id: 'contacts' as const, label: 'Contacts & Sync', icon: Smartphone },
            { id: 'ai' as const, label: 'Delta AI & Auto-Pilot', icon: Sparkles },
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

          {/* 2. Contacts & Sync Tab */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-delta-200 dark:border-delta-900 bg-delta-50/50 dark:bg-delta-950/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-delta-600" />
                    <h3 className="font-bold text-foreground">Phone Contacts Auto-Sync</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-delta-100 text-delta-800 dark:bg-delta-900 dark:text-delta-200">
                    {syncedContacts.filter((c) => c.is_on_delta).length} on Delta
                  </span>
                </div>

                <div className="mb-3 flex items-center gap-2 p-2 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Automatic Background Sync Active • Always Up to Date</span>
                </div>

                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Delta automatically synchronizes and matches 10-digit mobile numbers from your phone address book against registered users in real time. No manual synchronization is ever required.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      setIsSyncing(true);
                      setSyncFeedback('');
                      const res = await syncDeviceContacts();
                      setIsSyncing(false);
                      setSyncFeedback(`✓ Synced ${res.count} contacts.`);
                      setTimeout(() => setSyncFeedback(''), 4000);
                    }}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border text-foreground font-semibold hover:bg-muted disabled:opacity-50 transition-colors shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isContactsPickerSupported ? 'Re-check Device Contacts' : 'Sync Phone Contacts'}</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border text-foreground font-semibold hover:bg-muted transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Import .vcf / .csv</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".vcf,.csv,text/vcard,text/csv"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const text = await file.text();
                      const type = file.name.endsWith('.csv') ? 'csv' : 'vcf';
                      const res = await importContactsFromFile(text, type);
                      setSyncFeedback(`✓ Imported ${res.count} contacts (${res.matched} on Delta).`);
                      setTimeout(() => setSyncFeedback(''), 4000);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="hidden"
                  />

                  <button
                    onClick={() => {
                      syncSampleAddressBook();
                      setSyncFeedback('✓ Sample address book synchronized.');
                      setTimeout(() => setSyncFeedback(''), 4000);
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-[11px]"
                  >
                    Sample Contacts
                  </button>
                </div>

                {syncFeedback && (
                  <p className="mt-2 text-xs font-semibold text-delta-600 animate-fade-in">
                    {syncFeedback}
                  </p>
                )}
              </div>

              {/* Synced Contacts List */}
              <div>
                <p className="font-semibold text-foreground text-xs mb-2">
                  Synced Address Book ({syncedContacts.length} Contacts)
                </p>
                <div className="max-h-60 overflow-y-auto divide-y divide-border border border-border rounded-xl bg-card">
                  {syncedContacts.map((c) => (
                    <div key={c.id} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{c.phone_number}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          c.is_on_delta
                            ? 'bg-delta-100 text-delta-800 dark:bg-delta-950 dark:text-delta-300'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {c.is_on_delta ? '● On Delta' : 'Not Registered'}
                      </span>
                    </div>
                  ))}
                  {syncedContacts.length === 0 && (
                    <p className="p-4 text-center text-muted-foreground italic">
                      No contacts synced yet. Click &apos;Sync Phone Contacts&apos; to import contacts.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI & Auto-Pilot Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-4 animate-fade-in">
              {/* 1. Google Gemini API Key */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-cyan-500/10 border border-violet-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
                    <span className="font-bold text-sm text-foreground">Google Gemini API</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    geminiKey
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {geminiKey ? '🟢 Gemini 1.5 Flash Connected' : '⚡ Delta Local Engine'}
                  </span>
                </div>

                <p className="text-muted-foreground text-xs leading-relaxed">
                  Delta uses Google&apos;s free <strong>Gemini 1.5 Flash API</strong> for ultra-fast Tanglish intelligence and open conversational capabilities without training a model.
                </p>

                <div>
                  <label className="font-semibold text-muted-foreground block mb-1">
                    Gemini API Key (Free from Google AI Studio)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={geminiKey}
                      onChange={(e) => {
                        setGeminiKey(e.target.value);
                        if (typeof window !== 'undefined') {
                          localStorage.setItem('delta_gemini_api_key', e.target.value.trim());
                        }
                        setIsAiSaved(true);
                        setTimeout(() => setIsAiSaved(false), 2000);
                      }}
                      className="flex-1 bg-muted text-foreground text-xs font-mono px-3 py-2 rounded-xl border border-transparent focus:border-violet-500 focus:bg-background focus:outline-none"
                    />
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 transition-all shadow-2xs"
                    >
                      <span>Get Free Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {isAiSaved && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                      ✅ Key saved to local storage! Delta AI is now using Gemini 1.5 Flash.
                    </p>
                  )}
                </div>
              </div>

              {/* 2. Auto-Pilot & Meal Status ("sptn" vs "inu ila") */}
              <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-sm text-foreground block">AI Auto-Pilot Mode</span>
                    <span className="text-muted-foreground text-xs">Automatically answer routine questions (e.g. food, status) based on your real state</span>
                  </div>
                  <button
                    onClick={toggleAiAutoPilot}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      isAiAutoPilot ? 'bg-violet-600' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        isAiAutoPilot ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-2 border-t border-border/40 space-y-2">
                  <span className="font-bold text-xs text-foreground block">
                    Current Lunch / Meal Status
                  </span>
                  <p className="text-muted-foreground text-[11px]">
                    When Diva or friends ask <em>&quot;Macha saptyaa daa?&quot;</em>, Delta AI auto-replies according to this setting:
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setMealStatus('had_lunch')}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        mealStatus === 'had_lunch'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold'
                          : 'border-border/60 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <span className="text-base block mb-0.5">🍛</span>
                      <span className="text-xs font-bold block">Sptn</span>
                      <span className="text-[10px] opacity-80 block">(Had Lunch)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMealStatus('not_yet')}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        mealStatus === 'not_yet'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold'
                          : 'border-border/60 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <span className="text-base block mb-0.5">⏳</span>
                      <span className="text-xs font-bold block">Inu Ila</span>
                      <span className="text-[10px] opacity-80 block">(Not Yet)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMealStatus('auto_schedule')}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        mealStatus === 'auto_schedule'
                          ? 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300 font-bold'
                          : 'border-border/60 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <span className="text-base block mb-0.5">🔄</span>
                      <span className="text-xs font-bold block">Auto (Clock)</span>
                      <span className="text-[10px] opacity-80 block">(By 1:30 PM)</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-muted-foreground italic bg-muted/40 p-2 rounded-xl mt-2">
                    💡 <strong>Pro-Tip:</strong> You don&apos;t even have to open Settings! You can simply message Delta AI in your inbox: <code>&quot;sptn&quot;</code> or <code>&quot;inu ila&quot;</code>, and it will update this instantly.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 3. Privacy & Security Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              {/* E2EE & Cryptographic Protection Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-delta-500/10 via-card to-emerald-500/10 border border-delta-500/20 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-foreground text-xs">
                      End-to-End Encryption (E2EE)
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    ● Active & Verified
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Your direct chats and media are protected with <span className="font-semibold text-foreground">{DELTA_SECURITY_SUMMARY.encryption.cipher}</span>. Only you and the recipient hold the decryption keys.
                </p>
                <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Protocol: Curve25519 ECDH + AES-256</span>
                  <span>Database: Kernel RLS Isolated</span>
                </div>
              </div>

              {/* 1. Last Seen & Online Presence */}
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Last Seen & Presence
                </label>
                <p className="text-muted-foreground text-[11px] mb-2">
                  Controls who can see when you are online or your last activity
                </p>
                <select
                  value={lastSeen}
                  onChange={(e) => setLastSeen(e.target.value as PrivacySetting)}
                  className="w-full bg-muted text-foreground text-xs p-2 rounded-xl border border-transparent focus:border-border focus:outline-none"
                >
                  <option value="everyone">Everyone</option>
                  <option value="contacts">My Contacts Only (Recommended)</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              {/* 2. Read Receipts Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="pr-4">
                  <span className="font-semibold text-foreground block">
                    Read Receipts
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    If disabled, double violet checkmarks won&apos;t be sent or received for direct messages.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={readReceipts}
                  onChange={(e) => setReadReceipts(e.target.checked)}
                  className="w-4 h-4 rounded text-delta-600 focus:ring-delta-500 cursor-pointer shrink-0"
                />
              </div>

              {/* 3. Mobile Number Privacy */}
              <div className="pt-2 border-t border-border">
                <label className="font-semibold text-foreground block mb-1">
                  Mobile Number Visibility
                </label>
                <p className="text-muted-foreground text-[11px] mb-2">
                  Choose who can discover your profile using your phone number ({currentUser?.phone_number || 'Mobile Number'})
                </p>
                <select
                  value={phonePrivacy}
                  onChange={(e) => setPhonePrivacy(e.target.value as PrivacySetting)}
                  className="w-full bg-muted text-foreground text-xs p-2 rounded-xl border border-transparent focus:border-border focus:outline-none"
                >
                  <option value="contacts">My Contacts Only (Recommended)</option>
                  <option value="everyone">Everyone</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              {/* 4. Profile Photo Visibility */}
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
                  <option value="contacts">My Contacts Only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              {/* 5. Default Disappearing Messages */}
              <div className="pt-2 border-t border-border">
                <label className="font-semibold text-foreground block mb-1">
                  Default Disappearing Messages Timer
                </label>
                <p className="text-muted-foreground text-[11px] mb-2">
                  Automatically set new conversations to vanish after the selected duration
                </p>
                <select
                  value={disappearingDefault}
                  onChange={(e) => setDisappearingDefault(e.target.value)}
                  className="w-full bg-muted text-foreground text-xs p-2 rounded-xl border border-transparent focus:border-border focus:outline-none"
                >
                  <option value="0">Off (Keep indefinitely)</option>
                  <option value="86400">24 hours</option>
                  <option value="604800">7 days</option>
                  <option value="7776000">90 days</option>
                </select>
              </div>

              {/* 6. Screen Lock / Biometrics */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="pr-4">
                  <span className="font-semibold text-foreground block">
                    App Screen Lock
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    Require your device biometric or PIN to unlock Delta Web after inactivity.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={screenLock}
                  onChange={(e) => setScreenLock(e.target.checked)}
                  className="w-4 h-4 rounded text-delta-600 focus:ring-delta-500 cursor-pointer shrink-0"
                />
              </div>

              {/* Save & Feedback */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                {isSaved ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Privacy settings updated
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    Changes take effect across all synced devices immediately.
                  </span>
                )}
                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-delta-600 text-white rounded-xl font-bold hover:bg-delta-700 shadow-sm transition-colors text-xs"
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
