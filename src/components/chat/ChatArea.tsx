'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Phone,
  Video,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  Mic,
  X,
  Reply,
  Edit2,
  Trash2,
  Check,
  CheckCheck,
  FileText,
  Download,
  BarChart2,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Info,
  Clock,
  Shield,
  Lock,
  ArrowLeft,
  Sparkles,
  Copy,
  CheckCircle2,
  Radio,
  Users,
  UploadCloud,
  Zap,
  Palette,
  Maximize2,
  ExternalLink,
  Command,
  Satellite,
  ArrowUpRight,
} from 'lucide-react';
import { useMessaging } from '@/context/MessagingContext';
import { useAuth } from '@/context/AuthContext';
import {
  formatMessageTime,
  formatFileSize,
  getInitials,
  formatLastSeen,
  formatMessageDateSeparator,
} from '@/lib/utils';
import { callAudio } from '@/lib/callAudio';
import { Message, Profile, MessageType } from '@/types';
import { DeltaLogoWithText, DeltaLogoWithoutText } from '@/components/brand/DeltaLogo';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { DEMO_PROFILES } from '@/data/mockData';
import { expandOneWordCue, summarizeConversationThread, rewriteMessageWithAi } from '@/lib/ai/deltaAiEngine';
import { ThreadSummaryResult } from '@/types/ai';

interface ChatAreaProps {
  onBackMobile?: () => void;
  onOpenDetails?: () => void;
}

type WallpaperTheme = 'cosmic' | 'midnight' | 'emerald' | 'sapphire' | 'minimal';

export function ChatArea({ onBackMobile, onOpenDetails }: ChatAreaProps) {
  const {
    activeConversation,
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    replyingToMessage,
    setReplyingToMessage,
    editingMessage,
    setEditingMessage,
    votePoll,
    startCall,
    isTyping,
    clearChat,
    isSatelliteMode,
    satelliteTelemetry,
    setShowSatelliteRadar,
    userVoiceProfile,
    activeSmartReplies,
    applySmartReply,
    cancelScheduledTask,
    executeScheduledTaskNow,
  } = useMessaging();
  const { currentUser, availableDemoUsers } = useAuth();

  const [textInput, setTextInput] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Wallpaper theme state
  const [wallpaperTheme, setWallpaperTheme] = useState<WallpaperTheme>('cosmic');
  const [showWallpaperMenu, setShowWallpaperMenu] = useState(false);

  // In-chat search state
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);

  // Drag and drop overlay state
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Image lightbox state
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  // AI Message Thread Summarizer state
  const [summaryResult, setSummaryResult] = useState<ThreadSummaryResult | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummaryDrawer, setShowSummaryDrawer] = useState(false);
  const [isSummaryDismissed, setIsSummaryDismissed] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);

  // AI Tone Rewriter & Polisher state
  const [showAiRewriteMenu, setShowAiRewriteMenu] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);

  // Scroll to bottom floating button state
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset thread summary when changing conversation
  useEffect(() => {
    setSummaryResult(null);
    setShowSummaryDrawer(false);
    setIsSummaryDismissed(false);
    setSummaryCopied(false);
  }, [activeConversation?.id]);

  // Handle thread summarization with Delta AI
  const handleSummarizeThread = async () => {
    if (!activeConversation || messages.length === 0 || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const formatted = messages.map((m) => ({
        sender: m.sender_id === currentUser?.id ? 'Me' : activeConversation.title || 'Partner',
        content: m.content,
        timestamp: m.created_at,
      }));
      const result = await summarizeConversationThread(
        formatted,
        activeConversation.title || 'Chat'
      );
      setSummaryResult(result);
      setShowSummaryDrawer(true);
    } catch (err) {
      console.error('Failed to summarize thread:', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Handle message tone rewrite with AI
  const handleRewrite = async (style: 'professional' | 'tanglish' | 'friendly' | 'bullet' | 'ghostwrite') => {
    if (!textInput.trim() || isRewriting) return;
    setIsRewriting(true);
    setShowAiRewriteMenu(false);
    try {
      const rewritten = await rewriteMessageWithAi(textInput, style);
      setTextInput(rewritten);
    } catch (e) {
      console.error('Rewrite failed:', e);
    } finally {
      setIsRewriting(false);
    }
  };

  // Load persisted wallpaper
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('delta_wallpaper') as WallpaperTheme;
      if (stored) setWallpaperTheme(stored);
    }
  }, []);

  const changeWallpaper = (theme: WallpaperTheme) => {
    setWallpaperTheme(theme);
    localStorage.setItem('delta_wallpaper', theme);
    setShowWallpaperMenu(false);
  };

  // Auto scroll to latest message
  useEffect(() => {
    if (!showInChatSearch) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, showInChatSearch]);

  // Voice note timer
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isRecordingVoice) {
      interval = setInterval(() => setVoiceDuration((prev) => prev + 1), 1000);
    } else {
      setVoiceDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecordingVoice]);

  // Sync editing text
  useEffect(() => {
    if (editingMessage) {
      setTextInput(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 130)}px`;
    }
  }, [textInput]);

  // Handle scroll to detect if scrolled away from bottom
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isUp);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filter messages for in-chat search
  const searchMatches = useMemo(() => {
    if (!chatSearchQuery.trim()) return [];
    const q = chatSearchQuery.toLowerCase();
    return messages
      .filter((m) => !m.is_deleted && m.content.toLowerCase().includes(q))
      .map((m) => m.id);
  }, [messages, chatSearchQuery]);

  useEffect(() => {
    if (searchMatches.length > 0) {
      setSearchMatchIndex(0);
      const targetEl = document.getElementById(`msg-${searchMatches[0]}`);
      targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchMatches]);

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (searchMatchIndex + 1) % searchMatches.length;
    setSearchMatchIndex(nextIdx);
    const targetEl = document.getElementById(`msg-${searchMatches[nextIdx]}`);
    targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (searchMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setSearchMatchIndex(prevIdx);
    const targetEl = document.getElementById(`msg-${searchMatches[prevIdx]}`);
    targetEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (!activeConversation) {
    return (
      <div className={`flex-1 hidden md:flex flex-col items-center justify-center p-8 wallpaper-${wallpaperTheme} select-none text-center relative overflow-hidden`}>
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-delta-500/10 dark:bg-delta-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-lg flex flex-col items-center relative z-10 animate-fade-in">
          {/* Logo with radiant elevation */}
          <div className="mb-6 p-5 rounded-3xl bg-card/85 backdrop-blur-2xl border border-border/80 shadow-2xl flex items-center justify-center hover:scale-105 transition-transform">
            <DeltaLogoWithText height={60} />
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            Everything connects.
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-sm">
            End-to-end encrypted messaging, peer-to-peer WebRTC calling, and real-time database synchronization.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-3 mt-8 w-full text-left">
            <div className="p-4 rounded-2xl bg-card/75 backdrop-blur-xl border border-border/70 shadow-xs flex flex-col gap-1.5 hover:border-delta-500/30 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-foreground">End-to-End Encrypted</p>
              <p className="text-[11px] text-muted-foreground">Private & tamper-resistant</p>
            </div>

            <div className="p-4 rounded-2xl bg-card/75 backdrop-blur-xl border border-border/70 shadow-xs flex flex-col gap-1.5 hover:border-delta-500/30 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-delta-500/10 text-delta-600 dark:text-delta-400 flex items-center justify-center">
                <Video className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-foreground">HD Audio & Video</p>
              <p className="text-[11px] text-muted-foreground">Direct WebRTC connection</p>
            </div>

            <div className="p-4 rounded-2xl bg-card/75 backdrop-blur-xl border border-border/70 shadow-xs flex flex-col gap-1.5 hover:border-delta-500/30 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-foreground">Low Latency Sync</p>
              <p className="text-[11px] text-muted-foreground">Instant receipts & delivery</p>
            </div>

            <div className="p-4 rounded-2xl bg-card/75 backdrop-blur-xl border border-border/70 shadow-xs flex flex-col gap-1.5 hover:border-delta-500/30 transition-colors">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <p className="text-xs font-bold text-foreground">RLS Database Guard</p>
              <p className="text-[11px] text-muted-foreground">PostgreSQL row-level isolation</p>
            </div>
          </div>

          {/* Quick Keyboard shortcuts */}
          <div className="mt-8 flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
            <span>Press <kbd className="px-1.5 py-0.5 rounded-lg bg-muted border border-border text-foreground font-mono">Enter</kbd> to send</span>
            <span>•</span>
            <span><kbd className="px-1.5 py-0.5 rounded-lg bg-muted border border-border text-foreground font-mono">Shift + Enter</kbd> for newline</span>
          </div>
        </div>
      </div>
    );
  }

  // Partner profile for 1-to-1 calls and recipient identity
  const partnerProfile =
    activeConversation.type === 'direct'
      ? availableDemoUsers.find((p) =>
          activeConversation.members?.some(
            (m) => m.user_id === p.id && p.id !== currentUser?.id
          )
        ) ||
        availableDemoUsers.find((p) => p.display_name === activeConversation.title) ||
        DEMO_PROFILES[1]
      : null;

  const typingNames = isTyping[activeConversation.id] || [];
  const isTypingNow = typingNames.length > 0;
  const isOnline = partnerProfile?.presence_status === 'online';

  // Handle send message with audio feedback
  const handleSend = async () => {
    if (editingMessage) {
      if (textInput.trim()) {
        await editMessage(editingMessage.id, textInput.trim());
        callAudio.playMessageSentTone();
      }
      setTextInput('');
      setEditingMessage(null);
      return;
    }

    if (!textInput.trim()) return;

    // Check for quick slash commands
    const trimmed = textInput.trim();
    if (trimmed === '/poll') {
      setShowPollCreator(true);
      setTextInput('');
      return;
    }
    if (trimmed === '/call' && partnerProfile) {
      startCall(partnerProfile, 'audio');
      setTextInput('');
      return;
    }
    if (trimmed === '/video' && partnerProfile) {
      startCall(partnerProfile, 'video');
      setTextInput('');
      return;
    }
    if (trimmed === '/clear') {
      clearChat(activeConversation.id);
      setTextInput('');
      return;
    }

    callAudio.playMessageSentTone();
    await sendMessage(trimmed, 'text', {
      replyToId: replyingToMessage?.id,
    });
    setTextInput('');
    setReplyingToMessage(null);
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for newline
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Simulated voice note send
  const handleSendVoiceNote = async () => {
    setIsRecordingVoice(false);
    callAudio.playMessageSentTone();
    await sendMessage('Voice message', 'audio', {
      replyToId: replyingToMessage?.id,
      attachments: [
        {
          file_name: 'voice-note.m4a',
          file_size: 142000,
          mime_type: 'audio/mp4',
          file_url: 'https://actions.google.com/sounds/v1/water/rain_heavy.ogg',
          duration_seconds: voiceDuration || 14,
        },
      ],
    });
  };

  // Handle file attachment simulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    callAudio.playMessageSentTone();
    const isImg = file.type.startsWith('image/');
    sendMessage(isImg ? 'Photo' : file.name, isImg ? 'image' : 'document', {
      attachments: [
        {
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || 'application/octet-stream',
          file_url: URL.createObjectURL(file),
        },
      ],
    });
    setShowAttachMenu(false);
  };

  // Drag and drop file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const isImg = file.type.startsWith('image/');
      callAudio.playMessageSentTone();
      sendMessage(isImg ? 'Photo' : file.name, isImg ? 'image' : 'document', {
        attachments: [
          {
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type || 'application/octet-stream',
            file_url: URL.createObjectURL(file),
          },
        ],
      });
    }
  };

  // Handle poll creation
  const handleCreatePoll = () => {
    const validOptions = pollOptions.filter((o) => o.trim().length > 0);
    if (!pollQuestion.trim() || validOptions.length < 2) return;

    callAudio.playMessageSentTone();
    sendMessage(pollQuestion, 'poll', {
      pollData: {
        question: pollQuestion.trim(),
        options: validOptions,
        is_multiple: false,
      },
    });

    setPollQuestion('');
    setPollOptions(['', '']);
    setShowPollCreator(false);
  };

  const copyMessageContent = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className={`flex-1 flex flex-col h-full wallpaper-${wallpaperTheme} overflow-hidden relative select-none`}
    >
      {/* Drag & Drop File Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-delta-950/70 backdrop-blur-md flex flex-col items-center justify-center p-6 border-4 border-dashed border-delta-400 rounded-3xl m-4 animate-fade-in text-white pointer-events-none">
          <div className="w-16 h-16 rounded-3xl bg-delta-600 flex items-center justify-center shadow-2xl mb-4 animate-bounce">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-extrabold tracking-tight">Drop files to send securely</h3>
          <p className="text-sm opacity-80 mt-1">Images, documents, and recordings</p>
        </div>
      )}

      {/* 1. Ultra-Luxurious Glassmorphic Header */}
      <header className="h-16 px-4 border-b border-border/80 bg-card/85 backdrop-blur-xl flex items-center justify-between shrink-0 z-20 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile back button */}
          <button
            onClick={onBackMobile}
            className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground rounded-xl transition-colors"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Contact Avatar with Live Presence Ring */}
          <div
            onClick={onOpenDetails}
            className="relative w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-sm shrink-0 cursor-pointer ring-2 ring-border/80 hover:ring-delta-500 transition-all shadow-2xs group"
          >
            {activeConversation.avatar_url ? (
              <img
                src={activeConversation.avatar_url}
                alt={activeConversation.title || ''}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <span>{getInitials(activeConversation.title || 'D')}</span>
            )}
            {/* Live glowing presence dot */}
            {isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-card shadow-xs animate-pulse" />
            )}
          </div>

          {/* Title & Presence */}
          <div className="min-w-0 cursor-pointer" onClick={onOpenDetails}>
            <div className="flex items-center gap-1.5">
              <h2 className="font-extrabold text-sm text-foreground truncate leading-tight">
                {activeConversation.title}
              </h2>
              {activeConversation.type === 'channel' ? (
                <Radio className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              ) : activeConversation.type === 'group' ? (
                <Users className="w-3.5 h-3.5 text-delta-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-delta-600 dark:text-delta-400 shrink-0" />
              )}
            </div>

            <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
              {isTypingNow ? (
                <span className="text-delta-600 dark:text-delta-400 font-bold flex items-center gap-1">
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-delta-600 animate-bounce" />
                    <span className="w-1 h-1 rounded-full bg-delta-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1 h-1 rounded-full bg-delta-600 animate-bounce [animation-delay:0.4s]" />
                  </span>
                  <span>{typingNames.join(', ')} typing...</span>
                </span>
              ) : activeConversation.type === 'direct' && partnerProfile ? (
                isOnline ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                ) : (
                  formatLastSeen(partnerProfile.last_seen_at, partnerProfile.privacy_last_seen)
                )
              ) : activeConversation.type === 'group' ? (
                `${activeConversation.members?.length || 4} participants`
              ) : (
                'Official Verified Channel'
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 text-muted-foreground">
          {/* AI Thread Summarize Pill (Prominent when thread has >= 8 messages, e.g. Diva's 16 messages) */}
          {messages.length >= 8 && activeConversation.id !== 'conv-delta-ai' && (
            <button
              onClick={handleSummarizeThread}
              disabled={isSummarizing}
              title={`Summarize ${messages.length} messages with Delta AI`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600/15 via-delta-500/15 to-amber-500/15 hover:from-violet-600/25 hover:to-amber-500/25 text-violet-700 dark:text-violet-300 border border-violet-500/30 hover:border-violet-500/60 shadow-2xs hover:shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-500 ${isSummarizing ? 'animate-spin' : 'animate-pulse'}`} />
              <span className="hidden sm:inline">
                {isSummarizing ? 'Summarizing...' : `Summarize (${messages.length})`}
              </span>
            </button>
          )}

          {/* Satellite Direct-to-Cell Sky Radar Pill */}
          <button
            onClick={() => setShowSatelliteRadar(true)}
            title={
              isSatelliteMode
                ? `Direct-to-Cell Active: ${satelliteTelemetry.satellite_id} (${satelliteTelemetry.latency_ms}ms) - Click for Sky Radar`
                : 'Connect via Satellite Direct-to-Cell (Rel-17 NTN)'
            }
            aria-label="Satellite Sky Radar"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 ${
              isSatelliteMode
                ? 'bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-xs animate-pulse hover:bg-amber-500/25'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Satellite className={`w-4 h-4 ${isSatelliteMode ? 'animate-spin [animation-duration:10s]' : ''}`} />
            <span className="hidden lg:inline text-[11px]">
              {isSatelliteMode ? 'Direct-to-Cell' : 'Satellite'}
            </span>
          </button>

          {/* Wallpaper theme switcher popover */}
          <div className="relative">
            <button
              onClick={() => setShowWallpaperMenu(!showWallpaperMenu)}
              title="Change chat wallpaper theme"
              aria-label="Wallpaper theme"
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted hover:text-foreground transition-all duration-150"
            >
              <Palette className="w-4 h-4" />
            </button>

            {showWallpaperMenu && (
              <div className="absolute right-0 top-11 bg-card/95 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl p-2.5 w-52 z-40 text-xs animate-fade-in reaction-bar-shadow">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                  Chat Wallpaper Theme
                </p>
                <div className="space-y-1 mt-1">
                  {[
                    { id: 'cosmic', label: 'Cosmic Violet', icon: '🟣' },
                    { id: 'midnight', label: 'Midnight Obsidian', icon: '🌌' },
                    { id: 'emerald', label: 'Emerald Matrix', icon: '🌿' },
                    { id: 'sapphire', label: 'Sapphire Ocean', icon: '🌊' },
                    { id: 'minimal', label: 'Minimal Canvas', icon: '🎨' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => changeWallpaper(t.id as WallpaperTheme)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors ${
                        wallpaperTheme === t.id
                          ? 'bg-delta-50 text-delta-700 dark:bg-delta-950 dark:text-delta-300 font-bold'
                          : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                      </span>
                      {wallpaperTheme === t.id && <Check className="w-3.5 h-3.5 text-delta-600" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* In-Chat Search toggle */}
          <button
            onClick={() => {
              setShowInChatSearch(!showInChatSearch);
              if (showInChatSearch) setChatSearchQuery('');
            }}
            title="Search inside this conversation"
            aria-label="Search conversation"
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 ${
              showInChatSearch
                ? 'bg-delta-100 text-delta-800 dark:bg-delta-950 dark:text-delta-300'
                : 'hover:bg-muted hover:text-foreground'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>

          {partnerProfile && (
            <>
              <button
                onClick={() => startCall(partnerProfile, 'audio')}
                title="Start HD Audio Call"
                aria-label="Audio Call"
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted hover:text-foreground transition-all duration-150 active:scale-95"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => startCall(partnerProfile, 'video')}
                title="Start HD Video Call"
                aria-label="Video Call"
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted hover:text-foreground transition-all duration-150 active:scale-95"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Details toggle */}
          <button
            onClick={onOpenDetails}
            title="Conversation information"
            aria-label="Conversation details"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted hover:text-foreground transition-all duration-150"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Conversation Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              title="More options"
              aria-label="More options"
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted hover:text-foreground transition-all duration-150"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-11 bg-card/95 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl py-1.5 w-52 z-40 text-xs animate-fade-in reaction-bar-shadow">
                <button
                  onClick={() => {
                    onOpenDetails?.();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-muted font-medium transition-colors"
                >
                  <Info className="w-4 h-4 text-delta-600" />
                  View Contact & Media
                </button>
                <button
                  onClick={() => {
                    setShowInChatSearch(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-muted font-medium transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Search Conversation
                </button>
                {messages.length > 0 && activeConversation.id !== 'conv-delta-ai' && (
                  <button
                    onClick={() => {
                      handleSummarizeThread();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left hover:bg-muted font-medium transition-colors text-violet-600 dark:text-violet-400"
                  >
                    <Sparkles className="w-4 h-4 text-violet-500" />
                    Summarize with Delta AI
                  </button>
                )}
                <button
                  onClick={() => {
                    clearChat(activeConversation.id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-destructive hover:bg-destructive/10 font-semibold transition-colors border-t border-border/60 mt-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Message History
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Satellite Direct-to-Cell Live Status Banner */}
      {isSatelliteMode && (
        <div
          onClick={() => setShowSatelliteRadar(true)}
          className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between cursor-pointer hover:bg-amber-500/20 transition-colors select-none"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="font-extrabold text-[11px]">
              🛰️ Connected via Starlink Direct-to-Cell ({satelliteTelemetry.satellite_id})
            </span>
            <span className="hidden md:inline text-[11px] opacity-85">
              • Ground Cellular Bypassed • Latency: {satelliteTelemetry.latency_ms}ms • Elevation: {satelliteTelemetry.elevation_deg}°
            </span>
          </div>
          <span className="text-[11px] font-bold underline flex items-center gap-1">
            Sky Radar <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      )}

      {/* In-Chat Search Bar Drawer */}
      {showInChatSearch && (
        <div className="px-4 py-2 border-b border-border/80 bg-card/90 backdrop-blur-md flex items-center justify-between gap-3 text-xs z-15 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              autoFocus
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder="Search in this chat..."
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {searchMatches.length > 0 && (
              <span className="text-[11px] text-muted-foreground font-semibold">
                {searchMatchIndex + 1} of {searchMatches.length}
              </span>
            )}
            <button
              onClick={handlePrevMatch}
              disabled={searchMatches.length === 0}
              className="p-1 rounded-lg hover:bg-muted disabled:opacity-30"
              title="Previous match"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMatch}
              disabled={searchMatches.length === 0}
              className="p-1 rounded-lg hover:bg-muted disabled:opacity-30"
              title="Next match"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setShowInChatSearch(false);
                setChatSearchQuery('');
              }}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground ml-1"
              title="Close search"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* AI Catch-Up Banner (Appears when thread has 10+ or 15+ messages e.g. Diva's 16 messages) */}
      {messages.length >= 10 && !isSummaryDismissed && !showSummaryDrawer && !isSummarizing && activeConversation.id !== 'conv-delta-ai' && (
        <div className="mx-4 my-2 p-3 rounded-2xl bg-gradient-to-r from-violet-500/15 via-purple-500/10 to-delta-500/15 border border-violet-500/30 backdrop-blur-md flex items-center justify-between gap-3 shadow-xs animate-fade-in select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-bold text-foreground truncate">
                  {activeConversation.title} sent {messages.length} messages
                </p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                  ⚡ 15+ Messages Catch-Up
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Delta AI can summarize what was conveyed so you don&apos;t have to read everything.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleSummarizeThread}
              className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Summarize with AI</span>
            </button>
            <button
              onClick={() => setIsSummaryDismissed(true)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              title="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* AI Summarizing Loading State */}
      {isSummarizing && (
        <div className="mx-4 my-2 p-3.5 rounded-2xl bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-delta-500/10 border border-violet-500/30 backdrop-blur-md flex items-center gap-3 animate-pulse select-none">
          <div className="w-8 h-8 rounded-xl bg-violet-600/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 animate-spin text-violet-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">
              Delta AI is analyzing {messages.length} messages from {activeConversation.title}...
            </p>
            <p className="text-[11px] text-muted-foreground">
              Extracting core points, lunch status, evening plans, and pending questions.
            </p>
          </div>
        </div>
      )}

      {/* AI Thread Summary Card / Drawer */}
      {showSummaryDrawer && summaryResult && (
        <div className="mx-4 my-2 p-4 rounded-2xl bg-card/95 backdrop-blur-2xl border-2 border-violet-500/30 shadow-xl animate-fade-in relative overflow-hidden select-none">
          {/* Ambient top glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-delta-500 to-amber-500" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
                <Sparkles className="w-4 h-4 text-violet-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-extrabold text-foreground tracking-tight">
                    Delta AI Thread Catch-Up
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-500/20">
                    {summaryResult.messageCountAnalyzed} messages analyzed
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Briefing for conversation with <strong>{summaryResult.conversationTitle}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const textToCopy = `📌 Summary of chat with ${summaryResult.conversationTitle}:\n${summaryResult.executiveSummary}\n\nKey Points:\n${summaryResult.bulletPoints.map((b) => `• ${b}`).join('\n')}\n\nAction / Next Steps:\n${summaryResult.actionItems.map((a) => `• ${a}`).join('\n')}`;
                  navigator.clipboard.writeText(textToCopy);
                  setSummaryCopied(true);
                  setTimeout(() => setSummaryCopied(false), 2000);
                }}
                title="Copy summary to clipboard"
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {summaryCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Copy</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowSummaryDrawer(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                title="Close summary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Executive Summary: What was conveyed importantly */}
          <div className="p-3 rounded-xl bg-violet-500/10 dark:bg-violet-950/30 border border-violet-500/25 mb-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider mb-1">
              <Zap className="w-3 h-3 text-amber-500" />
              <span>What is Importantly Conveyed</span>
            </div>
            <p className="text-xs text-foreground font-medium leading-relaxed">
              {summaryResult.executiveSummary}
            </p>
          </div>

          {/* Key Discussion Points */}
          {summaryResult.bulletPoints.length > 0 && (
            <div className="mb-3 space-y-1.5">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Key Discussion Highlights
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {summaryResult.bulletPoints.map((point, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded-xl bg-surface/80 dark:bg-muted/40 border border-border/60 text-xs text-foreground"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                    <span className="leading-snug">{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items & Quick Reply */}
          {summaryResult.actionItems.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Pending Decision / Action</span>
                </p>
                <p className="text-xs text-foreground font-medium truncate mt-0.5">
                  {summaryResult.actionItems[0]}
                </p>
              </div>

              {/* 1-tap fast replies */}
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                <button
                  onClick={() => {
                    sendMessage('Varen macha, 5:30 PM YMCA pakka! 🏏');
                    setShowSummaryDrawer(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Reply: &quot;Varen macha 🏏&quot;</span>
                </button>
                <button
                  onClick={() => {
                    setTextInput('Varen macha, 5:30 PM YMCA pakka! 🏏');
                    setShowSummaryDrawer(false);
                    textareaRef.current?.focus();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-surface dark:bg-muted text-foreground hover:bg-muted/80 text-xs font-medium border border-border/80 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3 text-muted-foreground" />
                  <span>Insert to Input</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Message List Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2 select-text"
      >
        {/* End-to-End Encryption Banner */}
        <div className="flex justify-center my-2 select-none">
          <button
            onClick={onOpenDetails}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-[11px] max-w-lg text-center shadow-2xs transition-all cursor-pointer group"
            title="Click to view encryption and security verification"
          >
            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Messages and calls are end-to-end encrypted. Click to verify safety code.</span>
          </button>
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6 select-none">
            <div className="w-14 h-14 rounded-3xl bg-card border border-border/80 shadow-md flex items-center justify-center mb-3">
              <Sparkles className="w-7 h-7 text-delta-600" />
            </div>
            <p className="font-extrabold text-sm text-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Say hello, share photos, start a poll, or record a voice note!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.sender_id === currentUser?.id;
            const isDeleted = msg.is_deleted;
            const isGroup = activeConversation.type === 'group';

            // Check if date changed from previous message
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const currentDateStr = formatMessageDateSeparator(msg.created_at);
            const prevDateStr = prevMsg ? formatMessageDateSeparator(prevMsg.created_at) : '';
            const showDateSeparator = currentDateStr && currentDateStr !== prevDateStr;

            // Check if grouped with previous message
            const isSameSenderAsPrev = prevMsg && prevMsg.sender_id === msg.sender_id && !showDateSeparator;
            const isSearchMatch = chatSearchQuery.trim() && msg.content.toLowerCase().includes(chatSearchQuery.toLowerCase());

            return (
              <React.Fragment key={msg.id}>
                {/* Floating Date Separator */}
                {showDateSeparator && (
                  <div className="flex justify-center my-3 select-none">
                    <span className="px-3.5 py-1 rounded-full bg-card/85 dark:bg-card/75 backdrop-blur-md border border-border/70 text-[11px] font-bold text-muted-foreground shadow-2xs">
                      {currentDateStr}
                    </span>
                  </div>
                )}

                <div
                  id={`msg-${msg.id}`}
                  onMouseEnter={() => setHoveredMessageId(msg.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                  className={`group relative flex flex-col ${isOwn ? 'items-end' : 'items-start'} ${
                    isSameSenderAsPrev ? 'mt-1' : 'mt-2.5'
                  }`}
                >
                  {/* Floating Quick Action & Reaction Bar on Hover */}
                  {hoveredMessageId === msg.id && !isDeleted && (
                    <div
                      className={`absolute -top-8 z-30 flex items-center gap-0.5 bg-card/95 backdrop-blur-2xl border border-border rounded-full shadow-xl px-2 py-1 text-muted-foreground reaction-bar-shadow animate-fade-in ${
                        isOwn ? 'right-2' : 'left-2'
                      }`}
                    >
                      {['❤️', '🔥', '👍', '😂', '🎉', '🙏'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            reactToMessage(msg.id, emoji);
                            callAudio.playMessageSentTone();
                          }}
                          className="p-1 hover:scale-130 transition-transform text-sm leading-none active:scale-95"
                          title={`React with ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}

                      <span className="w-px h-3.5 bg-border/80 mx-1" />

                      <button
                        onClick={() => setReplyingToMessage(msg)}
                        title="Reply"
                        className="p-1 hover:text-foreground hover:scale-110 transition-transform"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => copyMessageContent(msg.id, msg.content)}
                        title={copiedId === msg.id ? 'Copied!' : 'Copy text'}
                        className="p-1 hover:text-foreground hover:scale-110 transition-transform"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isOwn && (
                        <>
                          <button
                            onClick={() => setEditingMessage(msg)}
                            title="Edit message"
                            className="p-1 hover:text-foreground hover:scale-110 transition-transform"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteMessage(msg.id)}
                            title="Delete message"
                            className="p-1 hover:text-destructive hover:scale-110 transition-transform"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Message Bubble Container with Specular Shine */}
                  <div
                    className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 transition-all duration-150 animate-message-in ${
                      isOwn
                        ? 'bubble-outgoing-gradient rounded-tr-xs'
                        : 'bubble-incoming-card rounded-tl-xs'
                    } ${
                      isDeleted ? 'italic text-muted-foreground bg-muted/40 border-dashed border-border' : ''
                    } ${isSearchMatch ? 'ring-2 ring-amber-400 dark:ring-amber-300' : ''}`}
                  >
                    {/* Business Sender Header */}
                    {msg.metadata?.business && (
                      <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-border/40 select-none">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-black ${isOwn ? 'text-white' : 'text-delta-600 dark:text-delta-400'}`}>
                            {msg.metadata.business.business_name || 'Delta Business'}
                          </span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/20" />
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                          ₹0.00 Fee
                        </span>
                      </div>
                    )}

                    {/* Sender Name in Group */}
                    {isGroup && !isOwn && msg.sender && !isSameSenderAsPrev && !msg.metadata?.business && (
                      <p className="text-xs font-bold text-delta-600 dark:text-delta-400 mb-1 leading-tight">
                        {msg.sender.display_name}
                      </p>
                    )}

                    {/* Replying-to Preview */}
                    {msg.reply_to && (
                      <div
                        className={`text-xs p-2 rounded-xl mb-2 border-l-3 ${
                          isOwn
                            ? 'bg-black/15 border-white text-white/95'
                            : 'bg-muted/80 border-delta-600 text-muted-foreground'
                        }`}
                      >
                        <span className="font-bold block truncate">
                          {msg.reply_to.sender?.display_name || 'Member'}
                        </span>
                        <p className="truncate line-clamp-1">{msg.reply_to.content}</p>
                      </div>
                    )}

                    {/* Attachments rendering */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="space-y-2 mb-1.5">
                        {msg.attachments.map((att) => {
                          const isAudio = att.mime_type.startsWith('audio/');
                          const isImage = att.mime_type.startsWith('image/');

                          if (isAudio) {
                            return (
                              <VoiceNotePlayer
                                key={att.id}
                                isOwn={isOwn}
                                senderName={isOwn ? 'Me' : activeConversation?.title || 'Friend'}
                                durationSeconds={att.duration_seconds || 15}
                              />
                            );
                          }

                          if (isImage) {
                            return (
                              <div
                                key={att.id}
                                onClick={() => setLightboxImage({ url: att.file_url, name: att.file_name })}
                                className="relative group/img rounded-xl overflow-hidden max-h-72 border border-black/10 shadow-xs cursor-pointer"
                              >
                                <img
                                  src={att.file_url}
                                  alt={att.file_name}
                                  className="w-full h-full object-cover group-hover/img:scale-103 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Maximize2 className="w-5 h-5 drop-shadow-md" />
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={att.id}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                                isOwn
                                  ? 'bg-white/10 border-white/20 text-white'
                                  : 'bg-muted/70 border-border text-foreground'
                              }`}
                            >
                              <FileText className={`w-8 h-8 shrink-0 ${isOwn ? 'text-white' : 'text-delta-600'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">{att.file_name}</p>
                                <p className="text-[10px] opacity-75">{formatFileSize(att.file_size)}</p>
                              </div>
                              <a
                                href={att.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg hover:bg-black/10 transition-colors"
                                title="Download document"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Interactive Poll rendering */}
                    {msg.poll && (
                      <div className="min-w-[240px] sm:min-w-[290px] space-y-2.5 select-none my-1">
                        <div className="flex items-center gap-2">
                          <BarChart2 className="w-4 h-4 opacity-80" />
                          <h4 className="text-sm font-extrabold leading-tight">{msg.poll.question}</h4>
                        </div>

                        <div className="space-y-2">
                          {msg.poll.options.map((option) => {
                            const percent =
                              (msg.poll?.total_votes || 0) > 0
                                ? Math.round(((option.votes_count || 0) / (msg.poll?.total_votes || 1)) * 100)
                                : 0;

                            return (
                              <button
                                key={option.id}
                                onClick={() => {
                                  votePoll(msg.id, option.id);
                                  callAudio.playMessageSentTone();
                                }}
                                className={`w-full relative overflow-hidden rounded-xl border text-left p-2.5 text-xs transition-all active:scale-98 ${
                                  option.has_voted
                                    ? isOwn
                                      ? 'bg-white/25 border-white font-extrabold'
                                      : 'border-delta-600 bg-delta-50 dark:bg-delta-950 font-extrabold'
                                    : isOwn
                                    ? 'bg-white/10 border-white/20 hover:bg-white/15'
                                    : 'bg-muted/50 border-border hover:bg-muted'
                                }`}
                              >
                                {/* Progress bar background */}
                                <div
                                  style={{ width: `${percent}%` }}
                                  className={`absolute left-0 top-0 bottom-0 transition-all duration-300 opacity-25 ${
                                    isOwn ? 'bg-white' : 'bg-delta-600'
                                  }`}
                                />
                                <div className="relative flex items-center justify-between gap-2">
                                  <span className="truncate">{option.option_text}</span>
                                  <span className="shrink-0 font-mono text-[11px] opacity-90 font-bold">
                                    {option.votes_count} ({percent}%)
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <p className="text-[10px] opacity-75 font-semibold">
                          {msg.poll.total_votes} votes total
                        </p>
                      </div>
                    )}

                    {/* Call Log Message Bubble */}
                    {msg.type === 'call' && (
                      <div className="flex items-center gap-3 py-1">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isOwn ? 'bg-white/20 text-white' : 'bg-delta-100 dark:bg-delta-950 text-delta-600'
                          }`}
                        >
                          {msg.content.includes('Video') ? (
                            <Video className="w-4 h-4" />
                          ) : (
                            <Phone className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">{msg.content}</p>
                          <p className="text-[10px] opacity-75">Encrypted WebRTC Session</p>
                        </div>
                      </div>
                    )}

                    {/* Text Content */}
                    {msg.type !== 'poll' && msg.type !== 'call' && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-normal">
                        {msg.content}
                      </p>
                    )}

                    {/* Interactive Template & Action Buttons */}
                    {msg.metadata?.template?.buttons && msg.metadata.template.buttons.length > 0 && (
                      <div className="space-y-1.5 pt-2 mt-1.5 border-t border-border/40">
                        {msg.metadata.template.buttons.map((btn: any, bIdx: number) => (
                          <button
                            key={bIdx}
                            onClick={() => {
                              if (btn.type === 'URL' && btn.url) {
                                window.open(btn.url, '_blank');
                              } else {
                                sendMessage(btn.text);
                              }
                            }}
                            className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all active:scale-98 ${
                              isOwn
                                ? 'bg-white/20 hover:bg-white/30 text-white'
                                : 'bg-delta-500/10 hover:bg-delta-500/20 text-delta-600 dark:text-delta-400 border border-delta-500/20'
                            }`}
                          >
                            {btn.type === 'URL' && <ExternalLink className="w-3 h-3" />}
                            <span>{btn.text}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {msg.metadata?.interactive?.buttons && (
                      <div className="space-y-1.5 pt-2 mt-1.5 border-t border-border/40">
                        {msg.metadata.interactive.buttons.map((btn: any, bIdx: number) => (
                          <button
                            key={bIdx}
                            onClick={() => sendMessage(btn.title)}
                            className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all active:scale-98 ${
                              isOwn
                                ? 'bg-white/20 hover:bg-white/30 text-white'
                                : 'bg-delta-500/10 hover:bg-delta-500/20 text-delta-600 dark:text-delta-400 border border-delta-500/20'
                            }`}
                          >
                            <span>{btn.title}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Delta AI Scheduled Task Card */}
                    {msg.metadata?.aiTask && (
                      <div className="mt-2.5 p-3 rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-cyan-500/10 border border-violet-500/30 text-foreground space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-violet-600 dark:text-violet-400">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
                            {msg.metadata.aiTask.type === 'reminder' ? 'Scheduled Reminder' : 'Automated Message'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            msg.metadata.aiTask.status === 'sent'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : msg.metadata.aiTask.status === 'cancelled'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 animate-pulse'
                          }`}>
                            {msg.metadata.aiTask.status === 'sent' ? '✅ Sent' : msg.metadata.aiTask.status === 'cancelled' ? '❌ Cancelled' : '⏳ Queued'}
                          </span>
                        </div>

                        <div className="text-xs space-y-1 bg-surface/80 dark:bg-muted/60 p-2.5 rounded-xl border border-border/50">
                          {msg.metadata.aiTask.type === 'send_message' && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Recipient:</span>
                              <span className="font-bold text-foreground">{msg.metadata.aiTask.recipientName}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{msg.metadata.aiTask.type === 'reminder' ? 'Task:' : 'Message:'}</span>
                            <span className="font-semibold text-foreground italic">"{msg.metadata.aiTask.content}"</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Scheduled For:</span>
                            <span className="font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {msg.metadata.aiTask.scheduledTimeStr}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Task Action Buttons */}
                        {msg.metadata.aiTask.status === 'pending' && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => {
                                if (msg.metadata?.aiTask?.id) {
                                  executeScheduledTaskNow(msg.metadata.aiTask.id);
                                }
                              }}
                              className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-2xs"
                            >
                              <Zap className="w-3 h-3" />
                              Send Now
                            </button>
                            <button
                              onClick={() => {
                                if (msg.metadata?.aiTask?.id) {
                                  cancelScheduledTask(msg.metadata.aiTask.id);
                                }
                              }}
                              className="py-1.5 px-2.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 transition-all active:scale-95"
                            >
                              <X className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Metadata: Edited, Timestamp, Receipt Ticks, Satellite badge */}
                    <div
                      className={`flex items-center justify-end gap-1.5 text-[10px] mt-1 select-none font-medium ${
                        isOwn ? 'text-white/80' : 'text-muted-foreground'
                      }`}
                    >
                      {msg.is_satellite && (
                        <span
                          title={`Direct-to-Cell Satellite Link: ${msg.satellite_meta?.satellite_id || 'Starlink V2'} (${msg.satellite_meta?.constellation || '3GPP NTN'}) • Latency: ${msg.satellite_meta?.latency_ms || 780}ms • Azimuth: ${msg.satellite_meta?.azimuth_deg || 218}°`}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                            isOwn
                              ? 'bg-black/25 text-amber-200 border border-amber-300/30'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                          }`}
                        >
                          <Satellite className="w-2.5 h-2.5" />
                          <span>Satellite Uplink</span>
                        </span>
                      )}
                      {msg.is_edited && <span>(edited)</span>}
                      <span>{formatMessageTime(msg.created_at)}</span>

                      {/* Receipts Status */}
                      {isOwn && (
                        <span className="shrink-0 ml-0.5">
                          {msg.has_failed ? (
                            <span className="text-red-300 font-bold">Failed</span>
                          ) : msg.is_optimistic ? (
                            <Clock className="w-3 h-3 animate-spin opacity-80" />
                          ) : msg.status === 'read' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-sky-300 stroke-[2.6]" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-white/70 stroke-[2]" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-white/70 stroke-[2]" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reactions badge cluster */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 px-1">
                      {msg.reactions.map((reaction) => (
                        <button
                          key={reaction.id}
                          onClick={() => {
                            reactToMessage(msg.id, reaction.emoji);
                            callAudio.playMessageSentTone();
                          }}
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border shadow-2xs transition-transform active:scale-90 ${
                            reaction.user_id === currentUser?.id
                              ? 'bg-delta-100 border-delta-300 text-delta-800 dark:bg-delta-950 dark:border-delta-800 dark:text-delta-300 font-bold'
                              : 'bg-card/90 backdrop-blur-md border-border text-foreground hover:bg-muted'
                          }`}
                        >
                          <span>{reaction.emoji}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll-to-Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          aria-label="Scroll to latest messages"
          className="absolute right-6 bottom-28 z-30 w-10 h-10 rounded-full bg-card/90 backdrop-blur-xl border border-border shadow-xl flex items-center justify-center text-foreground hover:bg-muted transition-all active:scale-95 animate-fade-in"
        >
          <ChevronDown className="w-5 h-5 text-delta-600" />
        </button>
      )}

      {/* 3. Floating Island Composer Dock */}
      <div className="p-2 sm:p-3 shrink-0 z-20">
        <div className="max-w-4xl mx-auto rounded-3xl bg-card/90 backdrop-blur-2xl border border-border/80 composer-island p-2.5 transition-all">
          {/* Replying-to Banner */}
          {replyingToMessage && (
            <div className="flex items-center justify-between bg-muted/80 px-3.5 py-2 rounded-2xl mb-2 text-xs border-l-4 border-l-delta-600 animate-fade-in shadow-2xs">
              <div className="min-w-0">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Reply className="w-3.5 h-3.5 text-delta-600" />
                  Replying to {replyingToMessage.sender?.display_name || 'Member'}
                </span>
                <p className="text-muted-foreground truncate line-clamp-1 mt-0.5">
                  {replyingToMessage.content}
                </p>
              </div>
              <button
                onClick={() => setReplyingToMessage(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Satellite Mode Active Uplink Dock Banner */}
          {isSatelliteMode && (
            <div
              onClick={() => setShowSatelliteRadar(true)}
              className="flex items-center justify-between bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/30 px-3.5 py-1.5 rounded-2xl mb-2 text-xs text-amber-700 dark:text-amber-300 transition-all cursor-pointer shadow-2xs group select-none"
              title="Click to open Satellite Sky Radar & Telemetry"
            >
              <div className="flex items-center gap-2">
                <Satellite className="w-3.5 h-3.5 text-amber-500 animate-spin [animation-duration:12s]" />
                <span className="font-bold text-[11px]">
                  Satellite Direct-to-Cell Active • 3GPP Rel-17 NTN Uplink ({satelliteTelemetry.satellite_id})
                </span>
              </div>
              <span className="text-[10px] font-semibold underline flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Sky Radar <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          )}

          {/* AI 3-Intent Smart Reply Chips (Tanglish / Slang Personalized) */}
          {activeSmartReplies.length > 0 && !editingMessage && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none animate-fade-in">
              <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1 shrink-0 px-2 py-1 rounded-full bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-900/50 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
                Smart Reply:
              </span>
              {activeSmartReplies.map((reply) => (
                <button
                  key={reply.id}
                  onClick={() => applySmartReply(reply)}
                  className="shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full bg-surface dark:bg-muted/80 border border-border/80 hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-950/40 text-foreground transition-all duration-150 shadow-2xs hover:scale-102 active:scale-98 flex items-center gap-1.5 cursor-pointer"
                >
                  {reply.emoji && <span>{reply.emoji}</span>}
                  <span>{reply.text}</span>
                </button>
              ))}
            </div>
          )}

          {/* Editing Banner */}
          {editingMessage && (
            <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 px-3.5 py-2 rounded-2xl mb-2 text-xs border-l-4 border-l-amber-500 animate-fade-in shadow-2xs">
              <div className="min-w-0">
                <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <Edit2 className="w-3.5 h-3.5" />
                  Editing message
                </span>
              </div>
              <button
                onClick={() => {
                  setEditingMessage(null);
                  setTextInput('');
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Live Audio Recording Overlay */}
          {isRecordingVoice ? (
            <div className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 px-4 py-2.5 rounded-2xl animate-fade-in shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
                <span className="text-xs font-bold text-red-600 dark:text-red-400 font-mono">
                  Recording audio note: {voiceDuration}s
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRecordingVoice(false)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-xl hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendVoiceNote}
                  className="px-4 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 shadow-sm active:scale-95"
                >
                  Send Voice Note
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              {/* Attachment Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowAttachMenu(!showAttachMenu);
                    setShowEmojiPicker(false);
                  }}
                  title="Add attachment"
                  aria-label="Add attachment"
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                    showAttachMenu
                      ? 'bg-delta-100 text-delta-800 dark:bg-delta-950 dark:text-delta-300'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Paperclip className="w-5 h-5 stroke-[2.2]" />
                </button>

                {/* Attachment Popover */}
                {showAttachMenu && (
                  <div className="absolute bottom-13 left-0 bg-card/95 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl p-2 w-52 z-40 text-xs animate-fade-in space-y-1 reaction-bar-shadow">
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowAttachMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-muted font-semibold transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <span>Photo or Video</span>
                    </button>
                    <button
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowAttachMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-muted font-semibold transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-delta-500/10 text-delta-600 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span>Document or PDF</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowPollCreator(true);
                        setShowAttachMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-muted font-semibold transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <BarChart2 className="w-4 h-4" />
                      </div>
                      <span>Create Live Poll</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Emoji Popover Trigger */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowAttachMenu(false);
                  }}
                  title="Insert emoji"
                  aria-label="Insert emoji"
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                    showEmojiPicker
                      ? 'bg-delta-100 text-delta-800 dark:bg-delta-950 dark:text-delta-300'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Smile className="w-5 h-5 stroke-[2.2]" />
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-13 left-0 bg-card/95 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl p-3 w-76 z-40 text-sm animate-fade-in reaction-bar-shadow">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Popular Reactions & Emojis
                    </p>
                    <div className="grid grid-cols-6 gap-2 text-2xl">
                      {[
                        '😀', '😂', '🔥', '🚀', '❤️', '👍',
                        '🎉', '✨', '👏', '🙏', '💯', '🇮🇳',
                        '😍', '🥳', '🙌', '💡', '⚡', '☕'
                      ].map((e) => (
                        <button
                          key={e}
                          onClick={() => {
                            setTextInput((prev) => prev + e);
                            setShowEmojiPicker(false);
                            textareaRef.current?.focus();
                          }}
                          className="hover:scale-130 transition-transform p-1.5 text-center active:scale-95"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Main Textarea Container */}
              <div className="flex-1 flex items-center bg-muted/50 hover:bg-muted/80 focus-within:bg-background focus-within:ring-2 focus-within:ring-delta-500/20 rounded-2xl border border-border/60 focus-within:border-delta-500/40 transition-all shadow-2xs">
                <textarea
                  ref={textareaRef}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Type a message or /poll... (Enter to send, Shift+Enter for newline)"
                  aria-label="Type a message"
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm px-4 py-2.5 max-h-32 resize-none focus:outline-none"
                />
                {textInput.trim() && (
                  <div className="relative mr-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowAiRewriteMenu(!showAiRewriteMenu)}
                      disabled={isRewriting}
                      title="AI Tone Polisher: Polish, Tanglish slang, or bulletize draft"
                      className="p-1.5 rounded-xl bg-violet-100 hover:bg-violet-200 dark:bg-violet-950/70 dark:hover:bg-violet-900/90 text-violet-600 dark:text-violet-300 transition-all hover:scale-105 active:scale-95 shadow-2xs flex items-center gap-1 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 text-violet-500 ${isRewriting ? 'animate-spin' : 'animate-pulse'}`} />
                      <span className="hidden sm:inline">{isRewriting ? 'Rewriting...' : 'AI Polish'}</span>
                    </button>

                    {showAiRewriteMenu && (
                      <div className="absolute right-0 bottom-10 bg-card/95 backdrop-blur-2xl border border-border rounded-2xl shadow-2xl p-2 w-56 z-40 text-xs animate-fade-in reaction-bar-shadow">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>AI Tone Polisher</span>
                        </p>
                        <div className="space-y-1 mt-1">
                          <button
                            type="button"
                            onClick={() => handleRewrite('ghostwrite')}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left hover:bg-muted text-foreground transition-colors cursor-pointer"
                          >
                            <span>⚡</span>
                            <div>
                              <p className="font-bold">Auto-Ghostwrite</p>
                              <p className="text-[10px] text-muted-foreground">Expand 1-word cues into full messages</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRewrite('tanglish')}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left hover:bg-muted text-foreground transition-colors cursor-pointer"
                          >
                            <span>🍛</span>
                            <div>
                              <p className="font-bold">Tanglish Casual Slang</p>
                              <p className="text-[10px] text-muted-foreground">Colloquial macha, da, semma, pakka</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRewrite('professional')}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left hover:bg-muted text-foreground transition-colors cursor-pointer"
                          >
                            <span>💼</span>
                            <div>
                              <p className="font-bold">Corporate / Professional</p>
                              <p className="text-[10px] text-muted-foreground">Polite and formal business phrasing</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRewrite('friendly')}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left hover:bg-muted text-foreground transition-colors cursor-pointer"
                          >
                            <span>😊</span>
                            <div>
                              <p className="font-bold">Warm & Friendly</p>
                              <p className="text-[10px] text-muted-foreground">Upbeat tone with subtle emojis</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRewrite('bullet')}
                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left hover:bg-muted text-foreground transition-colors cursor-pointer"
                          >
                            <span>📝</span>
                            <div>
                              <p className="font-bold">Bulletize & Shorten</p>
                              <p className="text-[10px] text-muted-foreground">Clean, concise bullet points</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Send button OR Voice Record button */}
              {textInput.trim() || editingMessage ? (
                <button
                  onClick={handleSend}
                  title="Send message (Enter)"
                  aria-label="Send message"
                  className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-delta-600 to-violet-600 hover:opacity-95 text-white flex items-center justify-center transition-all shadow-md shadow-delta-600/25 active:scale-95 shrink-0"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              ) : (
                <button
                  onClick={() => setIsRecordingVoice(true)}
                  title="Hold or click to record voice note"
                  aria-label="Record voice note"
                  className="w-10 h-10 rounded-2xl bg-muted/60 text-muted-foreground hover:text-delta-600 hover:bg-delta-50 dark:hover:bg-delta-950 flex items-center justify-center transition-all shrink-0 active:scale-95"
                >
                  <Mic className="w-5 h-5 stroke-[2.2]" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Fullscreen Image Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 animate-fade-in"
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 text-white">
            <a
              href={lightboxImage.url}
              download={lightboxImage.name}
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              title="Download image"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={() => setLightboxImage(null)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              title="Close image preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl border border-white/15"
          >
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              className="w-full h-full object-contain max-h-[80vh]"
            />
          </div>
          <p className="text-white/80 text-xs mt-3 font-medium">{lightboxImage.name}</p>
        </div>
      )}

      {/* 5. Interactive Poll Creator Dialog */}
      {showPollCreator && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card/95 backdrop-blur-2xl border border-border rounded-3xl shadow-2xl p-6 w-full max-w-md animate-fade-in reaction-bar-shadow">
            <div className="flex items-center justify-between pb-3.5 border-b border-border/80">
              <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-delta-600" />
                Create a Live Poll
              </h3>
              <button
                onClick={() => setShowPollCreator(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 my-4">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Poll Question
                </label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="e.g., When should we schedule the release?"
                  className="w-full bg-muted/70 text-foreground placeholder:text-muted-foreground text-xs p-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-delta-500/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground block">
                  Options
                </label>
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...pollOptions];
                        next[idx] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 bg-muted/70 text-foreground placeholder:text-muted-foreground text-xs p-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-delta-500/20"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => {
                          setPollOptions(pollOptions.filter((_, i) => i !== idx));
                        }}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {pollOptions.length < 5 && (
                  <button
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="text-xs font-bold text-delta-600 hover:text-delta-700 py-1"
                  >
                    + Add Option
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/80">
              <button
                onClick={() => setShowPollCreator(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePoll}
                disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-tr from-delta-600 to-violet-600 text-white hover:opacity-95 disabled:opacity-40 shadow-sm active:scale-95"
              >
                Publish Poll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
