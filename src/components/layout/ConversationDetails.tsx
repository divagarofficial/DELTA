'use client';

import React, { useState } from 'react';
import {
  X,
  Phone,
  Video,
  Bell,
  ShieldCheck,
  Clock,
  Ban,
  Flag,
  Users,
  FileText,
  Image as ImageIcon,
  Check,
  UserPlus,
  Lock,
  Copy,
  QrCode,
} from 'lucide-react';
import { useMessaging } from '@/context/MessagingContext';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/utils';
import { DEMO_PROFILES } from '@/data/mockData';
import { generateSafetyNumber } from '@/lib/security';

interface ConversationDetailsProps {
  onClose: () => void;
}

export function ConversationDetails({ onClose }: ConversationDetailsProps) {
  const { activeConversation, startCall, toggleMuteConversation } = useMessaging();
  const { currentUser, availableDemoUsers } = useAuth();
  const [disappearingDuration, setDisappearingDuration] = useState('0');
  const [isBlocked, setIsBlocked] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showSecurityCodeModal, setShowSecurityCodeModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!activeConversation) return null;

  const isGroup = activeConversation.type === 'group';
  const partnerProfile =
    !isGroup
      ? availableDemoUsers.find((p) =>
          activeConversation.members?.some(
            (m) => m.user_id === p.id && p.id !== currentUser?.id
          )
        ) ||
        availableDemoUsers.find((p) => p.display_name === activeConversation.title) ||
        DEMO_PROFILES[1]
      : null;

  const safetyNumbers = generateSafetyNumber(
    currentUser?.id || 'delta-user-me',
    partnerProfile?.id || activeConversation.id
  );

  const handleReport = () => {
    if (!reportReason.trim()) return;
    setReportSubmitted(true);
    setTimeout(() => {
      setShowReportDialog(false);
      setReportSubmitted(false);
      setReportReason('');
    }, 1500);
  };

  return (
    <aside className="w-full sm:w-[320px] lg:w-[360px] shrink-0 border-l border-border bg-card flex flex-col h-full overflow-y-auto select-none z-20">
      {/* Header */}
      <div className="p-3.5 border-b border-border flex items-center justify-between">
        <h3 className="font-bold text-sm text-foreground">
          {isGroup ? 'Group Information' : 'Contact Details'}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Profile Overview */}
      <div className="p-5 flex flex-col items-center text-center border-b border-border bg-surface-subtle/50 dark:bg-surface-dark/50">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-2xl text-foreground mb-3 ring-4 ring-border/50">
          {activeConversation.avatar_url ? (
            <img
              src={activeConversation.avatar_url}
              alt={activeConversation.title || ''}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{getInitials(activeConversation.title || 'D')}</span>
          )}
        </div>
        <h2 className="font-bold text-lg text-foreground leading-tight">
          {activeConversation.title}
        </h2>
        {partnerProfile ? (
          <>
            <p className="text-xs text-delta-600 font-semibold mt-0.5">
              @{partnerProfile.username}
            </p>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              {partnerProfile.phone_number || '+91 98765 00000'}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeConversation.members?.length || 4} members
          </p>
        )}

        {/* Quick Action Buttons */}
        {partnerProfile && (
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => startCall(partnerProfile, 'audio')}
              className="flex flex-col items-center gap-1 p-2 rounded-xl text-muted-foreground hover:text-delta-600 hover:bg-delta-50 dark:hover:bg-delta-950 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold">Audio</span>
            </button>
            <button
              onClick={() => startCall(partnerProfile, 'video')}
              className="flex flex-col items-center gap-1 p-2 rounded-xl text-muted-foreground hover:text-delta-600 hover:bg-delta-50 dark:hover:bg-delta-950 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <Video className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold">Video</span>
            </button>
          </div>
        )}
      </div>

      {/* About & Bio */}
      <div className="p-4 border-b border-border space-y-1">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          About
        </p>
        <p className="text-xs text-foreground leading-relaxed">
          {partnerProfile?.biography ||
            activeConversation.description ||
            'Delta communication space. Everything connects.'}
        </p>
      </div>

      {/* Disappearing Messages Setting */}
      <div className="p-4 border-b border-border space-y-2">
        <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
          <Clock className="w-4 h-4 text-delta-600" />
          <span>Disappearing Messages</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          New messages sent in this chat will disappear after the selected period.
        </p>
        <select
          value={disappearingDuration}
          onChange={(e) => setDisappearingDuration(e.target.value)}
          className="w-full bg-muted text-foreground text-xs p-2 rounded-xl border border-transparent focus:border-border focus:outline-none"
        >
          <option value="0">Off (Keep indefinitely)</option>
          <option value="86400">24 hours</option>
          <option value="604800">7 days</option>
          <option value="7776000">90 days</option>
        </select>
      </div>

      {/* Encryption & Security Verification */}
      <div className="p-4 border-b border-border space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>End-to-End Encryption</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {isVerified ? '✓ Verified' : 'Protected'}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Messages and calls are secured with 256-bit AES-GCM and PostgreSQL Row Level Security. Only conversation members can read this chat.
        </p>
        <button
          onClick={() => setShowSecurityCodeModal(true)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-medium text-xs transition-colors"
        >
          <Lock className="w-3.5 h-3.5 text-delta-600" />
          <span>Verify Safety Numbers</span>
        </button>
      </div>

      {/* Group Members List (if group) */}
      {isGroup && (
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Members ({activeConversation.members?.length || 4})
            </span>
          </div>
          <div className="space-y-2">
            {(activeConversation.members && activeConversation.members.length > 0
              ? activeConversation.members
              : DEMO_PROFILES.slice(0, 4).map((p, i) => ({
                  id: `m-fallback-${p.id}`,
                  conversation_id: activeConversation.id,
                  user_id: p.id,
                  role: i === 0 ? ('admin' as const) : ('member' as const),
                  joined_at: new Date().toISOString(),
                }))
            ).map((m, i) => {
              const member =
                availableDemoUsers.find((p) => p.id === m.user_id) ||
                DEMO_PROFILES.find((p) => p.id === m.user_id) || {
                  id: m.user_id,
                  display_name: 'Member',
                  avatar_url: null,
                };
              return (
                <div key={m.id || member.id} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center font-bold text-[10px]">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(member.display_name)
                      )}
                    </div>
                    <span className="truncate font-medium text-foreground">
                      {member.display_name} {member.id === currentUser?.id ? '(You)' : ''}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                    {m.role === 'admin' || i === 0 ? 'Admin' : 'Member'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Block & Report Actions */}
      <div className="p-4 space-y-2">
        <button
          onClick={() => setIsBlocked(!isBlocked)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
            isBlocked
              ? 'bg-red-50 text-red-600 dark:bg-red-950 font-bold'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Ban className="w-4 h-4" />
          {isBlocked ? 'Unblock Contact' : 'Block Contact'}
        </button>

        <button
          onClick={() => setShowReportDialog(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Flag className="w-4 h-4" />
          Report Abuse
        </button>
      </div>

      {/* Report Modal */}
      {showReportDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-full max-w-sm animate-fade-in">
            <h4 className="font-bold text-sm text-foreground flex items-center gap-2 mb-2">
              <Flag className="w-4 h-4 text-destructive" />
              Report Contact or Conversation
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              Help us keep Delta safe. Please describe the issue:
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Spam, harassment, impersonation, or suspicious activity..."
              className="w-full bg-muted text-foreground text-xs p-2.5 rounded-xl border border-transparent focus:border-border focus:bg-background focus:outline-none resize-none h-24 mb-3"
            />
            {reportSubmitted ? (
              <p className="text-xs text-emerald-600 font-bold text-center">
                ✓ Report submitted to Delta Trust & Safety.
              </p>
            ) : (
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowReportDialog(false)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReport}
                  disabled={!reportReason.trim()}
                  className="px-3 py-1.5 text-xs font-bold bg-destructive text-white rounded-xl disabled:opacity-50"
                >
                  Submit Report
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Code Verification Modal */}
      {showSecurityCodeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-full max-w-sm animate-fade-in text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-foreground mb-1">
              Verify Security Safety Numbers
            </h4>
            <p className="text-xs text-muted-foreground mb-4">
              To verify that messages and calls with <span className="font-semibold text-foreground">{partnerProfile?.display_name || activeConversation.title}</span> are end-to-end encrypted, compare these numbers with their device.
            </p>

            {/* 60-digit code grid (12 blocks of 5) */}
            <div className="bg-muted p-3.5 rounded-xl border border-border mb-4 font-mono text-xs font-bold tracking-wider grid grid-cols-3 gap-2 text-foreground">
              {safetyNumbers.map((block, idx) => (
                <span key={idx} className="bg-background py-1 rounded-md text-center shadow-2xs border border-border/40">
                  {block}
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(safetyNumbers.join(' '));
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="flex-1 py-2 px-3 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedCode ? 'Copied!' : 'Copy Code'}
              </button>
              <button
                onClick={() => {
                  setIsVerified(!isVerified);
                  setShowSecurityCodeModal(false);
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
                  isVerified
                    ? 'bg-muted text-muted-foreground hover:text-foreground'
                    : 'bg-delta-600 text-white hover:bg-delta-700'
                }`}
              >
                {isVerified ? 'Unmark' : 'Mark Verified'}
              </button>
            </div>
            <button
              onClick={() => setShowSecurityCodeModal(false)}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
