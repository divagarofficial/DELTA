'use client';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Pin,
  VolumeX,
  Check,
  CheckCheck,
  MoreVertical,
  Filter,
  X,
  Users,
  Radio,
  Sparkles,
  MessageSquareDashed,
} from 'lucide-react';
import { useMessaging } from '@/context/MessagingContext';
import { useAuth } from '@/context/AuthContext';
import { formatConversationTime, getInitials } from '@/lib/utils';
import { Conversation } from '@/types';

interface ConversationListProps {
  onOpenNewChat: () => void;
}

export function ConversationList({ onOpenNewChat }: ConversationListProps) {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    isTyping,
    markAsRead,
    togglePinConversation,
    toggleMuteConversation,
  } = useMessaging();
  const { currentUser, availableDemoUsers } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'groups' | 'channels' | 'pinned'>('all');
  const [menuConvId, setMenuConvId] = useState<string | null>(null);

  // Filter conversations based on query and filter tab
  const filteredConversations = conversations.filter((c) => {
    // Filter type
    if (filterType === 'unread' && (c.unread_count || 0) === 0) return false;
    if (filterType === 'groups' && c.type !== 'group') return false;
    if (filterType === 'channels' && c.type !== 'channel') return false;
    if (filterType === 'pinned' && !c.is_pinned) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (c.title || '').toLowerCase().includes(q);
      const matchMsg = (c.last_message?.content || '').toLowerCase().includes(q);
      return matchTitle || matchMsg;
    }
    return true;
  });

  // Sort: pinned first, then by updated_at desc
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  const handleSelect = (conv: Conversation) => {
    setActiveConversationId(conv.id);
    if ((conv.unread_count || 0) > 0) {
      markAsRead(conv.id);
    }
  };

  return (
    <div className="w-full md:w-[320px] lg:w-[370px] shrink-0 border-r border-border/80 bg-card/60 backdrop-blur-xl flex flex-col h-full select-none">
      {/* 1. Header with Stats & New Chat */}
      <div className="px-4 py-3.5 border-b border-border/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-extrabold text-xl text-foreground tracking-tight">Chats</h1>
          <span className="px-2 py-0.5 rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
            {conversations.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenNewChat}
            title="Start new conversation or group"
            aria-label="New Chat"
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-tr from-delta-600 to-violet-600 text-white hover:opacity-95 transition-all shadow-sm active:scale-95 focus:outline-none focus:ring-2 focus:ring-delta-500"
          >
            <Plus className="w-5 h-5 stroke-[2.4]" />
          </button>
        </div>
      </div>

      {/* 2. Search Input Bar */}
      <div className="px-3 pt-3 pb-2 space-y-2.5">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages or contacts..."
            aria-label="Search conversations"
            className="w-full bg-muted/60 hover:bg-muted/90 focus:bg-background text-foreground placeholder:text-muted-foreground text-xs pl-10 pr-8 py-2.5 rounded-xl border border-transparent focus:border-delta-500/30 focus:ring-2 focus:ring-delta-500/20 focus:outline-none transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills with Counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all duration-150 shrink-0 ${
              filterType === 'all'
                ? 'bg-delta-100 text-delta-800 dark:bg-delta-950 dark:text-delta-300 shadow-2xs border border-delta-200 dark:border-delta-800'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            All
          </button>

          <button
            onClick={() => setFilterType('unread')}
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all duration-150 shrink-0 flex items-center gap-1.5 ${
              filterType === 'unread'
                ? 'bg-delta-100 text-delta-800 dark:bg-delta-950 dark:text-delta-300 shadow-2xs border border-delta-200 dark:border-delta-800'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span>Unread</span>
            {totalUnread > 0 && (
              <span className="w-2 h-2 rounded-full bg-delta-600 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setFilterType('groups')}
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all duration-150 shrink-0 ${
              filterType === 'groups'
                ? 'bg-delta-100 text-delta-800 dark:bg-delta-950 dark:text-delta-300 shadow-2xs border border-delta-200 dark:border-delta-800'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Groups
          </button>

          <button
            onClick={() => setFilterType('channels')}
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all duration-150 shrink-0 ${
              filterType === 'channels'
                ? 'bg-delta-100 text-delta-800 dark:bg-delta-950 dark:text-delta-300 shadow-2xs border border-delta-200 dark:border-delta-800'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Channels
          </button>

          <button
            onClick={() => setFilterType('pinned')}
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all duration-150 shrink-0 flex items-center gap-1 ${
              filterType === 'pinned'
                ? 'bg-delta-100 text-delta-800 dark:bg-delta-950 dark:text-delta-300 shadow-2xs border border-delta-200 dark:border-delta-800'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Pin className="w-3 h-3 rotate-45" />
            <span>Pinned</span>
          </button>
        </div>

        {/* Quick-Access Favorite Contacts Strip */}
        <div className="pt-2 border-t border-border/40">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-1 py-1">
            {conversations
              .filter((c) => c.type === 'direct' || c.is_pinned)
              .slice(0, 7)
              .map((conv) => {
                const isSelected = activeConversationId === conv.id;
                const partner = availableDemoUsers.find((p) =>
                  conv.members?.some((m) => m.user_id === p.id && p.id !== currentUser?.id)
                ) || availableDemoUsers.find((p) => p.display_name === conv.title);
                const isOnline = partner?.presence_status === 'online';
                const firstName = (conv.title || '').split(' ')[0];

                return (
                  <button
                    key={`story-${conv.id}`}
                    onClick={() => handleSelect(conv)}
                    className="flex flex-col items-center gap-1 shrink-0 group focus:outline-none"
                    title={conv.title || ''}
                  >
                    <div className="relative">
                      <div
                        className={`w-11 h-11 rounded-full p-[2px] transition-all duration-200 ${
                          isSelected
                            ? 'bg-gradient-to-tr from-delta-600 via-violet-500 to-fuchsia-500 ring-2 ring-delta-500/30'
                            : (conv.unread_count || 0) > 0
                            ? 'bg-gradient-to-tr from-delta-600 to-pink-500'
                            : 'bg-border/80 group-hover:bg-delta-500/50'
                        }`}
                      >
                        <div className="w-full h-full rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-xs text-foreground ring-1 ring-card">
                          {conv.avatar_url ? (
                            <img
                              src={conv.avatar_url}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            />
                          ) : (
                            getInitials(conv.title || 'D')
                          )}
                        </div>
                      </div>

                      {/* Online dot */}
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-card shadow-xs animate-pulse" />
                      )}

                      {/* Unread badge count */}
                      {(conv.unread_count || 0) > 0 && (
                        <span className="absolute -top-1 -right-1 px-1 py-0.2 bg-rose-500 text-white text-[9px] font-extrabold rounded-full min-w-[15px] text-center shadow-xs ring-1 ring-card">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] max-w-[50px] truncate text-center ${
                        isSelected
                          ? 'font-extrabold text-delta-600 dark:text-delta-400'
                          : 'text-muted-foreground group-hover:text-foreground font-medium'
                      }`}
                    >
                      {firstName}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* 3. Conversation Items List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
        {sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
              <MessageSquareDashed className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-foreground">No conversations found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Try searching with a different term or start a fresh message.
            </p>
            <button
              onClick={onOpenNewChat}
              className="mt-3 text-xs font-bold text-delta-600 hover:text-delta-700 bg-delta-50 dark:bg-delta-950 px-3.5 py-1.5 rounded-xl border border-delta-200 dark:border-delta-800 transition-colors"
            >
              Start New Chat
            </button>
          </div>
        ) : (
          sortedConversations.map((conv) => {
            const isSelected = activeConversationId === conv.id;
            const typingList = isTyping[conv.id] || [];
            const isBeingTyped = typingList.length > 0;
            const lastMsg = conv.last_message;
            const isOwnLastMsg = lastMsg?.sender_id === currentUser?.id;

            // Resolve contact presence
            const partner =
              conv.type === 'direct'
                ? availableDemoUsers.find((p) =>
                    conv.members?.some((m) => m.user_id === p.id && p.id !== currentUser?.id)
                  ) ||
                  availableDemoUsers.find((p) => p.display_name === conv.title)
                : null;
            const isOnline = partner?.presence_status === 'online';

            return (
              <div
                key={conv.id}
                onClick={() => handleSelect(conv)}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all duration-150 border ${
                  isSelected
                    ? 'bg-delta-500/10 dark:bg-delta-500/15 border-delta-500/30 text-foreground ring-1 ring-delta-500/20 shadow-xs'
                    : 'border-transparent hover:bg-muted/50 text-foreground'
                }`}
              >
                {/* Avatar with Status badge */}
                <div className="relative shrink-0 w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-sm text-foreground shadow-2xs ring-1 ring-border/80">
                  {conv.avatar_url ? (
                    <img
                      src={conv.avatar_url}
                      alt={conv.title || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{getInitials(conv.title || 'D')}</span>
                  )}

                  {/* Online dot for direct chats */}
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-card shadow-xs" />
                  )}

                  {/* Group / Channel overlay icon badge */}
                  {conv.type === 'group' && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-delta-600 rounded-full flex items-center justify-center ring-2 ring-card text-white shadow-2xs">
                      <Users className="w-2.5 h-2.5" />
                    </span>
                  )}
                  {conv.type === 'channel' && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center ring-2 ring-card text-white shadow-2xs">
                      <Radio className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                {/* Content Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-sm text-foreground truncate">
                      {conv.title}
                    </span>
                    <span
                      className={`text-[11px] shrink-0 font-medium ${
                        (conv.unread_count || 0) > 0
                          ? 'font-bold text-delta-600 dark:text-delta-400'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatConversationTime(conv.updated_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 mt-0.5">
                    {/* Last message or typing indicator */}
                    <div className="flex items-center gap-1 min-w-0 text-xs truncate">
                      {isBeingTyped ? (
                        <span className="text-delta-600 dark:text-delta-400 font-semibold animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-delta-600 animate-ping" />
                          {typingList.join(', ')} is typing...
                        </span>
                      ) : (
                        <>
                          {isOwnLastMsg && lastMsg && (
                            <span className="shrink-0">
                              {lastMsg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-delta-600 dark:text-delta-400 stroke-[2.5]" />
                              ) : lastMsg.status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-muted-foreground stroke-[2]" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-muted-foreground stroke-[2]" />
                              )}
                            </span>
                          )}
                          <span
                            className={`truncate ${
                              (conv.unread_count || 0) > 0
                                ? 'font-bold text-foreground'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {lastMsg
                              ? lastMsg.type === 'poll'
                                ? `📊 Poll: ${lastMsg.poll?.question || lastMsg.content}`
                                : lastMsg.type === 'document'
                                ? `📄 Document: ${lastMsg.content}`
                                : lastMsg.type === 'audio'
                                ? '🎤 Voice message'
                                : lastMsg.content
                              : 'No messages yet'}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Indicators: unread badge, pin, mute */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {conv.is_muted && (
                        <VolumeX className="w-3.5 h-3.5 text-muted-foreground/60" />
                      )}
                      {conv.is_pinned && (
                        <Pin className="w-3.5 h-3.5 text-delta-600 fill-delta-600 rotate-45" />
                      )}
                      {(conv.unread_count || 0) > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-tr from-delta-600 to-violet-600 text-white text-[10px] font-extrabold min-w-[19px] text-center shadow-xs">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* More options button on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuConvId(menuConvId === conv.id ? null : conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground rounded-lg transition-opacity"
                  title="Conversation options"
                  aria-label="Conversation options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Dropdown menu */}
                {menuConvId === conv.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-3 top-10 bg-card/95 backdrop-blur-xl border border-border shadow-xl rounded-2xl py-1.5 w-48 z-40 text-xs animate-fade-in reaction-bar-shadow"
                  >
                    <button
                      onClick={() => {
                        togglePinConversation(conv.id);
                        setMenuConvId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors font-medium"
                    >
                      <Pin className="w-3.5 h-3.5" />
                      {conv.is_pinned ? 'Unpin chat' : 'Pin chat to top'}
                    </button>
                    <button
                      onClick={() => {
                        toggleMuteConversation(conv.id);
                        setMenuConvId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors font-medium"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      {conv.is_muted ? 'Unmute notifications' : 'Mute notifications'}
                    </button>
                    <button
                      onClick={() => {
                        markAsRead(conv.id);
                        setMenuConvId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors font-medium"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark as read
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
