'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Info,
  Clock,
  Shield,
  Lock,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { useMessaging } from '@/context/MessagingContext';
import { useAuth } from '@/context/AuthContext';
import { formatMessageTime, formatFileSize, getInitials, formatLastSeen } from '@/lib/utils';
import { Message, Profile, MessageType } from '@/types';
import { DeltaLogoWithText } from '@/components/brand/DeltaLogo';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { DEMO_PROFILES } from '@/data/mockData';

interface ChatAreaProps {
  onBackMobile?: () => void;
  onOpenDetails?: () => void;
}

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Voice note timer
  useEffect(() => {
    let interval: any;
    if (isRecordingVoice) {
      interval = setInterval(() => setVoiceDuration((prev) => prev + 1), 1000);
    } else {
      setVoiceDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  // Sync editing text
  useEffect(() => {
    if (editingMessage) {
      setTextInput(editingMessage.content);
    }
  }, [editingMessage]);

  if (!activeConversation) {
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 bg-surface-subtle dark:bg-surface-dark select-none text-center">
        <div className="max-w-md flex flex-col items-center">
          <div className="mb-6 p-4 rounded-3xl bg-card border border-border shadow-md flex items-center justify-center">
            <DeltaLogoWithText height={56} />
          </div>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Fast, secure, and modern communication for individuals, teams, and communities.
          </p>
          <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border px-4 py-2 rounded-full shadow-xs">
            <Shield className="w-4 h-4 text-delta-600" />
            <span>Database isolation enforced with Supabase Row Level Security</span>
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

  // Handle send message
  const handleSend = async () => {
    if (editingMessage) {
      if (textInput.trim()) {
        await editMessage(editingMessage.id, textInput.trim());
      }
      setTextInput('');
      setEditingMessage(null);
      return;
    }

    if (!textInput.trim()) return;

    await sendMessage(textInput.trim(), 'text', {
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
    await sendMessage('Voice message', 'audio', {
      replyToId: replyingToMessage?.id,
      attachments: [
        {
          file_name: 'voice-note.m4a',
          file_size: 142000,
          mime_type: 'audio/mp4',
          file_url: 'https://actions.google.com/sounds/v1/water/rain_heavy.ogg',
          duration_seconds: voiceDuration || 12,
        },
      ],
    });
  };

  // Handle file attachment simulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  // Handle poll creation
  const handleCreatePoll = () => {
    const validOptions = pollOptions.filter((o) => o.trim().length > 0);
    if (!pollQuestion.trim() || validOptions.length < 2) return;

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

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-subtle dark:bg-surface-dark overflow-hidden relative">
      {/* 1. Header */}
      <header className="h-16 px-4 border-b border-border bg-card/90 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile back button */}
          <button
            onClick={onBackMobile}
            className="md:hidden p-1.5 -ml-1 text-muted-foreground hover:text-foreground rounded-lg"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Avatar */}
          <div
            onClick={onOpenDetails}
            className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-sm shrink-0 cursor-pointer ring-1 ring-border"
          >
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

          {/* Title & Presence */}
          <div className="min-w-0 cursor-pointer" onClick={onOpenDetails}>
            <h2 className="font-bold text-sm text-foreground truncate leading-tight">
              {activeConversation.title}
            </h2>
            <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
              {isTypingNow ? (
                <span className="text-delta-600 font-semibold animate-pulse">
                  {typingNames.join(', ')} typing...
                </span>
              ) : activeConversation.type === 'direct' && partnerProfile ? (
                partnerProfile.presence_status === 'online' ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                ) : (
                  formatLastSeen(partnerProfile.last_seen_at, partnerProfile.privacy_last_seen)
                )
              ) : activeConversation.type === 'group' ? (
                `${activeConversation.members?.length || 4} members`
              ) : (
                'Official Broadcast Channel'
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 text-muted-foreground">
          {partnerProfile && (
            <>
              <button
                onClick={() => startCall(partnerProfile, 'audio')}
                title="Start Audio Call"
                aria-label="Audio Call"
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted hover:text-foreground transition-colors"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                onClick={() => startCall(partnerProfile, 'video')}
                title="Start Video Call"
                aria-label="Video Call"
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted hover:text-foreground transition-colors"
              >
                <Video className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Conversation Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              title="More options"
              aria-label="More options"
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted hover:text-foreground transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-11 bg-card border border-border rounded-xl shadow-xl py-1.5 w-48 z-40 text-xs animate-fade-in">
                <button
                  onClick={() => {
                    onOpenDetails?.();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted"
                >
                  <Info className="w-4 h-4" />
                  View Info
                </button>
                <button
                  onClick={() => {
                    clearChat(activeConversation.id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Chat Messages
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Message List Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* End-to-End Encryption Notice */}
        <div className="flex justify-center my-1 select-none">
          <button
            onClick={onOpenDetails}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-[11px] max-w-md text-center shadow-xs transition-colors cursor-pointer group"
            title="Click to view encryption and security verification"
          >
            <Lock className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Messages and calls are end-to-end encrypted. No one outside of this chat, not even Delta, can read or listen to them. Click to verify.</span>
          </button>
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6">
            <div className="w-12 h-12 rounded-2xl bg-card border border-border flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-delta-600" />
            </div>
            <p className="font-semibold text-sm text-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Send a greeting, share a document, start a poll, or record a voice note!
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.sender_id === currentUser?.id;
            const isDeleted = msg.is_deleted;
            const isGroup = activeConversation.type === 'group';

            return (
              <div
                key={msg.id}
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                className={`group relative flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
              >
                {/* Floating Quick Action Bar on Hover */}
                {hoveredMessageId === msg.id && !isDeleted && (
                  <div
                    className={`absolute -top-7 z-20 flex items-center gap-0.5 bg-card border border-border rounded-full shadow-md px-1.5 py-0.5 text-muted-foreground animate-fade-in ${
                      isOwn ? 'right-2' : 'left-2'
                    }`}
                  >
                    {['👍', '❤️', '😂', '🔥'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => reactToMessage(msg.id, emoji)}
                        className="p-1 hover:scale-125 transition-transform text-sm leading-none"
                      >
                        {emoji}
                      </button>
                    ))}
                    <span className="w-px h-3 bg-border mx-0.5" />
                    <button
                      onClick={() => setReplyingToMessage(msg)}
                      title="Reply"
                      className="p-1 hover:text-foreground"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                    {isOwn && (
                      <>
                        <button
                          onClick={() => setEditingMessage(msg)}
                          title="Edit"
                          className="p-1 hover:text-foreground"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          title="Delete"
                          className="p-1 hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Message Bubble Container */}
                <div
                  className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-xs transition-shadow ${
                    isOwn
                      ? 'bg-delta-600 text-white rounded-tr-xs'
                      : 'bg-card text-foreground border border-border/70 rounded-tl-xs'
                  } ${isDeleted ? 'italic text-muted-foreground bg-muted/50 border-none' : ''}`}
                >
                  {/* Sender Name in Group */}
                  {isGroup && !isOwn && msg.sender && (
                    <p className="text-xs font-bold text-delta-600 dark:text-delta-400 mb-1 leading-none">
                      {msg.sender.display_name}
                    </p>
                  )}

                  {/* Replying-to Preview */}
                  {msg.reply_to && (
                    <div
                      className={`text-xs p-2 rounded-lg mb-2 border-l-2 ${
                        isOwn
                          ? 'bg-white/15 border-white text-white/90'
                          : 'bg-muted border-delta-600 text-muted-foreground'
                      }`}
                    >
                      <span className="font-semibold block truncate">
                        {msg.reply_to.sender?.display_name || 'Member'}
                      </span>
                      <p className="truncate line-clamp-1">{msg.reply_to.content}</p>
                    </div>
                  )}

                  {/* Attachments rendering */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="space-y-2 mb-2">
                      {msg.attachments.map((att) => {
                        const isAudio = att.mime_type.startsWith('audio/');
                        const isImage = att.mime_type.startsWith('image/');

                        if (isAudio) {
                          return (
                            <VoiceNotePlayer
                              key={att.id}
                              durationSeconds={att.duration_seconds || 15}
                            />
                          );
                        }

                        if (isImage) {
                          return (
                            <div
                              key={att.id}
                              className="rounded-xl overflow-hidden max-h-72 border border-black/10"
                            >
                              <img
                                src={att.file_url}
                                alt={att.file_name}
                                className="w-full h-full object-cover"
                              />
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
                            <FileText className="w-8 h-8 text-delta-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{att.file_name}</p>
                              <p className="text-[10px] opacity-75">{formatFileSize(att.file_size)}</p>
                            </div>
                            <a
                              href={att.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
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
                    <div className="min-w-[240px] sm:min-w-[280px] space-y-2.5 select-none my-1">
                      <div className="flex items-center gap-1.5">
                        <BarChart2 className="w-4 h-4 opacity-80" />
                        <h4 className="text-sm font-bold leading-tight">{msg.poll.question}</h4>
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
                              onClick={() => votePoll(msg.id, option.id)}
                              className={`w-full relative overflow-hidden rounded-xl border text-left p-2.5 text-xs transition-all ${
                                option.has_voted
                                  ? isOwn
                                    ? 'bg-white/20 border-white font-bold'
                                    : 'border-delta-600 bg-delta-50 dark:bg-delta-950 font-bold'
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
                                <span className="shrink-0 font-mono text-[11px] opacity-90">
                                  {option.votes_count} ({percent}%)
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-[10px] opacity-75 font-medium">
                        {msg.poll.total_votes} votes total
                      </p>
                    </div>
                  )}

                  {/* Call Log Message Bubble */}
                  {msg.type === 'call' && (
                    <div className="flex items-center gap-2.5 py-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isOwn ? 'bg-white/20' : 'bg-delta-100 dark:bg-delta-950 text-delta-600'
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
                        <p className="text-[10px] opacity-75">WebRTC Encrypted Call</p>
                      </div>
                    </div>
                  )}

                  {/* Text Content */}
                  {msg.type !== 'poll' && msg.type !== 'call' && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  )}

                  {/* Metadata: Edited, Timestamp, Receipt Ticks */}
                  <div
                    className={`flex items-center justify-end gap-1 text-[10px] mt-1 select-none ${
                      isOwn ? 'text-white/80' : 'text-muted-foreground'
                    }`}
                  >
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
                          <CheckCheck className="w-3.5 h-3.5 text-sky-200 stroke-[2.5]" />
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
                        onClick={() => reactToMessage(msg.id, reaction.emoji)}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border shadow-xs transition-transform active:scale-90 ${
                          reaction.user_id === currentUser?.id
                            ? 'bg-delta-100 border-delta-300 text-delta-800 dark:bg-delta-950 dark:border-delta-800 dark:text-delta-300 font-bold'
                            : 'bg-card border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        <span>{reaction.emoji}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Message Composer Container */}
      <div className="p-3 border-t border-border bg-card/90 backdrop-blur-md shrink-0">
        {/* Replying-to Banner */}
        {replyingToMessage && (
          <div className="flex items-center justify-between bg-muted/80 px-3 py-2 rounded-xl mb-2 text-xs border-l-4 border-l-delta-600">
            <div className="min-w-0">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Reply className="w-3.5 h-3.5 text-delta-600" />
                Replying to {replyingToMessage.sender?.display_name || 'Member'}
              </span>
              <p className="text-muted-foreground truncate line-clamp-1">
                {replyingToMessage.content}
              </p>
            </div>
            <button
              onClick={() => setReplyingToMessage(null)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Editing Banner */}
        {editingMessage && (
          <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 px-3 py-2 rounded-xl mb-2 text-xs border-l-4 border-l-amber-500">
            <div className="min-w-0">
              <span className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <Edit2 className="w-3.5 h-3.5" />
                Editing message
              </span>
            </div>
            <button
              onClick={() => {
                setEditingMessage(null);
                setTextInput('');
              }}
              className="text-muted-foreground hover:text-foreground p-1"
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

        {/* Voice Note Recording Live Overlay */}
        {isRecordingVoice ? (
          <div className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-4 py-2.5 rounded-2xl animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
              <span className="text-xs font-bold text-red-600 font-mono">
                Recording audio note: {voiceDuration}s
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRecordingVoice(false)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSendVoiceNote}
                className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 shadow-sm"
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
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                title="Add attachment"
                aria-label="Add attachment"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Attachment Popover */}
              {showAttachMenu && (
                <div className="absolute bottom-12 left-0 bg-card border border-border rounded-2xl shadow-xl p-2 w-48 z-40 text-xs animate-fade-in space-y-1">
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-muted font-medium"
                  >
                    <ImageIcon className="w-4 h-4 text-sky-500" />
                    Photo / Image
                  </button>
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-muted font-medium"
                  >
                    <FileText className="w-4 h-4 text-delta-600" />
                    Document / PDF
                  </button>
                  <button
                    onClick={() => {
                      setShowPollCreator(true);
                      setShowAttachMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-muted font-medium"
                  >
                    <BarChart2 className="w-4 h-4 text-emerald-500" />
                    Create Live Poll
                  </button>
                </div>
              )}
            </div>

            {/* Quick Emoji Popover Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Insert emoji"
                aria-label="Insert emoji"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Smile className="w-5 h-5" />
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 bg-card border border-border rounded-2xl shadow-xl p-3 w-64 z-40 text-sm animate-fade-in">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">
                    Quick Emojis
                  </p>
                  <div className="grid grid-cols-6 gap-1.5 text-xl">
                    {['😀', '😂', '🔥', '🚀', '❤️', '👍', '🎉', '✨', '👏', '🙏', '💯', '🇮🇳'].map(
                      (e) => (
                        <button
                          key={e}
                          onClick={() => {
                            setTextInput((prev) => prev + e);
                            setShowEmojiPicker(false);
                          }}
                          className="hover:scale-125 transition-transform p-1 text-center"
                        >
                          {e}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Main Textarea */}
            <div className="flex-1 bg-muted/60 hover:bg-muted/80 focus-within:bg-background focus-within:ring-2 focus-within:ring-delta-500/20 rounded-2xl border border-transparent focus-within:border-border transition-all">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Type a message... (Enter sends, Shift+Enter for newline)"
                aria-label="Type a message"
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm px-3.5 py-2.5 max-h-32 resize-none focus:outline-none"
              />
            </div>

            {/* Send button OR Voice Record button */}
            {textInput.trim() || editingMessage ? (
              <button
                onClick={handleSend}
                title="Send message"
                aria-label="Send message"
                className="w-10 h-10 rounded-xl bg-delta-600 hover:bg-delta-700 text-white flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            ) : (
              <button
                onClick={() => setIsRecordingVoice(true)}
                title="Record voice note"
                aria-label="Record voice note"
                className="w-10 h-10 rounded-xl bg-muted text-muted-foreground hover:text-delta-600 hover:bg-delta-50 dark:hover:bg-delta-950 flex items-center justify-center transition-all shrink-0"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Interactive Poll Creator Dialog */}
      {showPollCreator && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-delta-600" />
                Create a Poll
              </h3>
              <button
                onClick={() => setShowPollCreator(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 mt-3.5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Question
                </label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full bg-muted text-foreground text-sm px-3 py-2 rounded-xl border border-transparent focus:border-border focus:bg-background focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Options
                </label>
                <div className="space-y-2">
                  {pollOptions.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const copy = [...pollOptions];
                        copy[i] = e.target.value;
                        setPollOptions(copy);
                      }}
                      placeholder={`Option ${i + 1}`}
                      className="w-full bg-muted text-foreground text-sm px-3 py-2 rounded-xl border border-transparent focus:border-border focus:bg-background focus:outline-none"
                    />
                  ))}
                </div>

                {pollOptions.length < 5 && (
                  <button
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="mt-2 text-xs font-semibold text-delta-600 hover:text-delta-700"
                  >
                    + Add option
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => setShowPollCreator(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePoll}
                  disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-delta-600 text-white hover:bg-delta-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  Create Poll
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
