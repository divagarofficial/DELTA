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
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'groups' | 'channels'>('all');
  const [menuConvId, setMenuConvId] = useState<string | null>(null);

  // Filter conversations based on query and filter tab
  const filteredConversations = conversations.filter((c) => {
    // Filter type
    if (filterType === 'unread' && (c.unread_count || 0) === 0) return false;
    if (filterType === 'groups' && c.type !== 'group') return false;
    if (filterType === 'channels' && c.type !== 'channel') return false;

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

  const handleSelect = (conv: Conversation) => {
    setActiveConversationId(conv.id);
    if ((conv.unread_count || 0) > 0) {
      markAsRead(conv.id);
    }
  };

  return (
    <div className="w-full md:w-[320px] lg:w-[360px] shrink-0 border-r border-border bg-card flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-3.5 pb-2 border-b border-border/70 flex items-center justify-between">
        <h1 className="font-bold text-xl text-foreground tracking-tight">Chats</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenNewChat}
            title="Start new conversation or group"
            aria-label="New Chat"
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-delta-600 text-white hover:bg-delta-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-delta-500"
          >
            <Plus className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-3 pt-2.5 pb-1.5">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages or contacts..."
            aria-label="Search conversations"
            className="w-full bg-muted/70 hover:bg-muted text-foreground placeholder:text-muted-foreground text-sm pl-9 pr-8 py-2 rounded-xl border border-transparent focus:border-border focus:bg-background focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-muted-foreground hover:text-foreground p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-1">
          {(['all', 'unread', 'groups', 'channels'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors shrink-0 ${
                filterType === type
                  ? 'bg-delta-100 text-delta-800 dark:bg-delta-950 dark:text-delta-300 font-semibold shadow-xs'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {type === 'all' ? 'All' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/40">
        {sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 px-4 text-center">
            <p className="text-sm font-medium text-foreground">No conversations found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try searching for another keyword or start a new chat.
            </p>
            <button
              onClick={onOpenNewChat}
              className="mt-3 text-xs font-semibold text-delta-600 hover:text-delta-700 bg-delta-50 dark:bg-delta-950 px-3 py-1.5 rounded-lg"
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

            return (
              <div
                key={conv.id}
                onClick={() => handleSelect(conv)}
                className={`group relative flex items-center gap-3 px-3.5 py-3 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-delta-50/70 dark:bg-delta-950/40 border-l-4 border-l-delta-600 pl-[11px]'
                    : 'hover:bg-muted/50'
                }`}
              >
                {/* Avatar with Status badge */}
                <div className="relative shrink-0 w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-sm text-foreground">
                  {conv.avatar_url ? (
                    <img
                      src={conv.avatar_url}
                      alt={conv.title || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{getInitials(conv.title || 'D')}</span>
                  )}

                  {/* Group / Channel overlay icon badge */}
                  {conv.type === 'group' && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-delta-600 rounded-full flex items-center justify-center ring-2 ring-card text-white">
                      <Users className="w-2.5 h-2.5" />
                    </span>
                  )}
                  {conv.type === 'channel' && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center ring-2 ring-card text-white">
                      <Radio className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {conv.title}
                    </span>
                    <span
                      className={`text-[11px] shrink-0 ${
                        (conv.unread_count || 0) > 0
                          ? 'font-bold text-delta-600'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatConversationTime(conv.updated_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 mt-1">
                    {/* Last message or typing indicator */}
                    <div className="flex items-center gap-1 min-w-0 text-xs truncate">
                      {isBeingTyped ? (
                        <span className="text-delta-600 font-semibold animate-pulse">
                          {typingList.join(', ')} is typing...
                        </span>
                      ) : (
                        <>
                          {isOwnLastMsg && lastMsg && (
                            <span className="shrink-0">
                              {lastMsg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-delta-600 stroke-[2.5]" />
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
                                ? 'font-semibold text-foreground'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {lastMsg
                              ? lastMsg.type === 'poll'
                                ? `📊 Poll: ${lastMsg.poll?.question || lastMsg.content}`
                                : lastMsg.type === 'document'
                                ? `📄 Document: ${lastMsg.content}`
                                : lastMsg.content
                              : 'No messages yet'}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Indicators: unread badge, pin, mute */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {conv.is_muted && (
                        <VolumeX className="w-3.5 h-3.5 text-muted-foreground/70" />
                      )}
                      {conv.is_pinned && (
                        <Pin className="w-3.5 h-3.5 text-delta-600 fill-delta-600 rotate-45" />
                      )}
                      {(conv.unread_count || 0) > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-delta-600 text-white text-[11px] font-bold min-w-[18px] text-center shadow-xs">
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
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground rounded transition-opacity"
                  title="Conversation options"
                  aria-label="Conversation options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Dropdown menu */}
                {menuConvId === conv.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-3 top-10 bg-card border border-border shadow-lg rounded-xl py-1.5 w-44 z-30 text-xs animate-fade-in"
                  >
                    <button
                      onClick={() => {
                        togglePinConversation(conv.id);
                        setMenuConvId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors"
                    >
                      <Pin className="w-3.5 h-3.5" />
                      {conv.is_pinned ? 'Unpin chat' : 'Pin chat'}
                    </button>
                    <button
                      onClick={() => {
                        toggleMuteConversation(conv.id);
                        setMenuConvId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      {conv.is_muted ? 'Unmute notifications' : 'Mute notifications'}
                    </button>
                    <button
                      onClick={() => {
                        markAsRead(conv.id);
                        setMenuConvId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted transition-colors"
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
