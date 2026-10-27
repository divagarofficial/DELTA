'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useTransition } from 'react';
import {
  Conversation,
  Message,
  MessageType,
  DeltaStatus,
  Channel,
  Community,
  CallSession,
  CallType,
  ReceiptStatus,
  Profile,
  SyncedPhoneContact,
} from '@/types';
import {
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  DEMO_PROFILES,
  DEMO_STATUSES,
  DEMO_CHANNELS,
  DEMO_COMMUNITIES,
} from '@/data/mockData';
import { useAuth } from './AuthContext';
import { createClient } from '@/lib/supabase/client';
import {
  isWebContactsSupported,
  pickNativeDeviceContacts,
  parseVCard,
  parseCSVContacts,
  matchContactsWithProfiles,
  DEMO_PHONE_ADDRESS_BOOK,
  RawContactInput,
} from '@/lib/contacts/contactSync';

interface SendMessageOptions {
  replyToId?: string;
  attachments?: {
    file_name: string;
    file_size: number;
    mime_type: string;
    file_url: string;
    duration_seconds?: number;
  }[];
  pollData?: {
    question: string;
    options: string[];
    is_multiple?: boolean;
  };
}

interface MessagingContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  messages: Message[];
  statuses: DeltaStatus[];
  channels: Channel[];
  communities: Community[];
  isTyping: Record<string, string[]>; // conversationId -> array of typing user display names
  activeCall: CallSession | null;
  searchFilter: string;
  activeTab: 'chats' | 'status' | 'channels' | 'communities' | 'settings';
  setActiveTab: (tab: 'chats' | 'status' | 'channels' | 'communities' | 'settings') => void;
  setActiveConversationId: (id: string | null) => void;
  setSearchFilter: (query: string) => void;
  sendMessage: (content: string, type?: MessageType, options?: SendMessageOptions) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  reactToMessage: (messageId: string, emoji: string) => Promise<void>;
  replyingToMessage: Message | null;
  setReplyingToMessage: (msg: Message | null) => void;
  editingMessage: Message | null;
  setEditingMessage: (msg: Message | null) => void;
  markAsRead: (conversationId: string) => void;
  createConversation: (targetUserId: string, title?: string, isGroup?: boolean) => string;
  createStatus: (content: string, mediaUrl?: string, mediaType?: 'text' | 'image' | 'video', bgColor?: string) => void;
  viewStatus: (statusId: string) => void;
  votePoll: (messageId: string, optionId: string) => void;
  startCall: (targetProfile: Profile, callType: CallType) => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  isMuted: boolean;
  isVideoEnabled: boolean;
  clearChat: (conversationId: string) => void;
  togglePinConversation: (conversationId: string) => void;
  toggleMuteConversation: (conversationId: string) => void;
  // Contact sync
  syncedContacts: SyncedPhoneContact[];
  isContactsPickerSupported: boolean;
  syncDeviceContacts: () => Promise<{ success: boolean; count: number; error?: string }>;
  importContactsFromFile: (content: string, type: 'vcf' | 'csv') => Promise<{ count: number; matched: number }>;
  addContactByPhone: (name: string, phoneNumber: string) => Promise<{ matchedUser?: Profile }>;
  removeSyncedContact: (id: string) => void;
  syncSampleAddressBook: () => void;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, isConfigured, availableDemoUsers } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string | null>('conv-priya');
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [statuses, setStatuses] = useState<DeltaStatus[]>(DEMO_STATUSES);
  const [channels, setChannels] = useState<Channel[]>(DEMO_CHANNELS);
  const [communities] = useState<Community[]>(DEMO_COMMUNITIES);
  const [isTyping, setIsTyping] = useState<Record<string, string[]>>({});
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'channels' | 'communities' | 'settings'>('chats');
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Phone Contact Sync State - Automatically initialized & continuously synchronized in background
  const [syncedContacts, setSyncedContacts] = useState<SyncedPhoneContact[]>(() => {
    return matchContactsWithProfiles(DEMO_PHONE_ADDRESS_BOOK, DEMO_PROFILES);
  });
  const [isContactsPickerSupported, setIsContactsPickerSupported] = useState(false);

  // Call state
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // Load from localStorage in browser if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsContactsPickerSupported(isWebContactsSupported());
      const storedConvs = localStorage.getItem('delta_conversations');
      const storedMsgs = localStorage.getItem('delta_messages');
      const storedStatuses = localStorage.getItem('delta_statuses');

      if (storedConvs) {
        try {
          const parsed: Conversation[] = JSON.parse(storedConvs);
          const migrated = parsed.map((c) =>
            c.avatar_url === '/delta-logo.svg' || c.avatar_url?.endsWith('.svg')
              ? { ...c, avatar_url: '/delta_logo_without_text.png' }
              : c
          );
          setConversations(migrated);
        } catch (e) { console.error(e); }
      }
      if (storedMsgs) {
        try { setMessagesMap(JSON.parse(storedMsgs)); } catch (e) { console.error(e); }
      }
      if (storedStatuses) {
        try { setStatuses(JSON.parse(storedStatuses)); } catch (e) { console.error(e); }
      }

      // Load or initialize synced phone contacts matched against registered users
      const storedSynced = localStorage.getItem('delta_synced_contacts');
      if (storedSynced) {
        try {
          const parsed = JSON.parse(storedSynced);
          const rawList = parsed.map((c: any) => ({ name: c.name, phone: c.phone_number }));
          const refreshed = matchContactsWithProfiles(rawList, availableDemoUsers);
          setSyncedContacts(refreshed);
        } catch (e) { console.error(e); }
      } else {
        // First-time visit: auto-match realistic address book contacts to discover Priya, Arjun, etc.
        const initial = matchContactsWithProfiles(DEMO_PHONE_ADDRESS_BOOK, availableDemoUsers);
        setSyncedContacts(initial);
        localStorage.setItem('delta_synced_contacts', JSON.stringify(initial));
      }
    }
  }, [availableDemoUsers]);

  // Keep phone contact matches in sync whenever available registered users change
  useEffect(() => {
    setSyncedContacts((prev) => {
      if (prev.length === 0) return prev;
      const raw = prev.map((c) => ({ name: c.name, phone: c.phone_number }));
      const refreshed = matchContactsWithProfiles(raw, availableDemoUsers);
      return refreshed;
    });
  }, [availableDemoUsers]);

  // Sync to localStorage
  const persistState = useCallback((newConvs: Conversation[], newMsgs: Record<string, Message[]>, newStats?: DeltaStatus[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('delta_conversations', JSON.stringify(newConvs));
      localStorage.setItem('delta_messages', JSON.stringify(newMsgs));
      if (newStats) {
        localStorage.setItem('delta_statuses', JSON.stringify(newStats));
      }
    }
  }, []);

  // Compute active conversation with latest last_message
  const activeConversation = React.useMemo(() => {
    if (!activeConversationId) return null;
    const conv = conversations.find((c) => c.id === activeConversationId);
    if (!conv) return null;
    const msgs = messagesMap[conv.id] || [];
    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
    return { ...conv, last_message: lastMsg };
  }, [conversations, activeConversationId, messagesMap]);

  // Messages for active conversation
  const currentMessages = React.useMemo(() => {
    if (!activeConversationId) return [];
    return messagesMap[activeConversationId] || [];
  }, [activeConversationId, messagesMap]);

  // Mark conversation as read
  const markAsRead = useCallback((convId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
    );
  }, []);

  // Send message with optimistic update & rollback handling
  const sendMessage = async (
    content: string,
    type: MessageType = 'text',
    options?: SendMessageOptions
  ) => {
    if (!activeConversationId || !currentUser) return;
    if (!content.trim() && !options?.attachments?.length && !options?.pollData) return;

    const tempId = `msg-opt-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: activeConversationId,
      sender_id: currentUser.id,
      sender: currentUser,
      content,
      type,
      created_at: nowIso,
      status: 'sent',
      is_optimistic: true,
      reply_to_message_id: options?.replyToId,
      reply_to: options?.replyToId
        ? (messagesMap[activeConversationId] || []).find((m) => m.id === options.replyToId) || null
        : null,
      attachments: options?.attachments?.map((att, idx) => ({
        id: `att-${Date.now()}-${idx}`,
        message_id: tempId,
        ...att,
      })),
      poll: options?.pollData
        ? {
            id: `poll-${Date.now()}`,
            message_id: tempId,
            question: options.pollData.question,
            is_multiple: options.pollData.is_multiple || false,
            is_anonymous: false,
            total_votes: 0,
            options: options.pollData.options.map((optText, oIdx) => ({
              id: `opt-${Date.now()}-${oIdx}`,
              poll_id: `poll-${Date.now()}`,
              option_text: optText,
              order_index: oIdx,
              votes_count: 0,
              has_voted: false,
            })),
          }
        : null,
    };

    // Optimistically append message
    const updatedMessages = [...(messagesMap[activeConversationId] || []), optimisticMsg];
    const newMessagesMap = { ...messagesMap, [activeConversationId]: updatedMessages };
    setMessagesMap(newMessagesMap);

    // Update conversation last updated and order
    const updatedConvs = conversations.map((c) =>
      c.id === activeConversationId
        ? { ...c, updated_at: nowIso, last_message: optimisticMsg }
        : c
    );
    // Move updated conversation to top
    updatedConvs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    setConversations(updatedConvs);
    persistState(updatedConvs, newMessagesMap);

    // Clear composer reply state
    setReplyingToMessage(null);

    // If Supabase is configured, push to database
    if (isConfigured) {
      try {
        const supabase = createClient();
        if (supabase) {
          const { data, error } = await supabase.from('messages').insert({
            conversation_id: activeConversationId,
            sender_id: currentUser.id,
            content,
            type,
            reply_to_message_id: options?.replyToId,
          }).select().single();

          if (error) throw error;

          // Replace optimistic ID with database ID
          setMessagesMap((prev) => ({
            ...prev,
            [activeConversationId]: (prev[activeConversationId] || []).map((m) =>
              m.id === tempId ? { ...m, id: data.id, is_optimistic: false, status: 'delivered' } : m
            ),
          }));
          return;
        }
      } catch (err) {
        console.error('Failed to send to Supabase, reverting optimistic message', err);
        setMessagesMap((prev) => ({
          ...prev,
          [activeConversationId]: (prev[activeConversationId] || []).map((m) =>
            m.id === tempId ? { ...m, has_failed: true } : m
          ),
        }));
        return;
      }
    }

    // In Demo Mode: Simulate realistic Delivery & Read receipts progression
    setTimeout(() => {
      setMessagesMap((prev) => ({
        ...prev,
        [activeConversationId]: (prev[activeConversationId] || []).map((m) =>
          m.id === tempId ? { ...m, is_optimistic: false, status: 'delivered' } : m
        ),
      }));
    }, 700);

    setTimeout(() => {
      setMessagesMap((prev) => ({
        ...prev,
        [activeConversationId]: (prev[activeConversationId] || []).map((m) =>
          m.id === tempId ? { ...m, status: 'read' } : m
        ),
      }));
    }, 1800);

    // In Demo Mode: Trigger intelligent simulated conversational reply if chatting with Priya, Arjun, or group
    const targetConv = conversations.find((c) => c.id === activeConversationId);
    if (targetConv && targetConv.type !== 'channel') {
      simulateDemoReply(activeConversationId, content, targetConv);
    }
  };

  // Simulated intelligent assistant / persona reply for demo mode
  const simulateDemoReply = (convId: string, userMsg: string, conv: Conversation) => {
    let responder = DEMO_PROFILES[1]; // Priya Sharma by default
    if (convId === 'conv-arjun') responder = DEMO_PROFILES[2]; // Arjun Patel
    if (conv.type === 'group') responder = DEMO_PROFILES[3]; // Ananya Iyer

    // Show typing indicator after 1.5s
    setTimeout(() => {
      setIsTyping((prev) => ({ ...prev, [convId]: [responder.display_name] }));
    }, 1500);

    // Send reply after 3.2s
    setTimeout(() => {
      setIsTyping((prev) => {
        const copy = { ...prev };
        delete copy[convId];
        return copy;
      });

      let replyText = `Thanks for sending that! The interaction feels snappy and responsive.`;
      const lower = userMsg.toLowerCase();

      if (lower.includes('call') || lower.includes('voice') || lower.includes('video')) {
        replyText = `I'm ready for the call! Tap the audio or video icon above to start the WebRTC connection.`;
      } else if (lower.includes('supabase') || lower.includes('database') || lower.includes('rls')) {
        replyText = `The Row Level Security policies and PostgreSQL migrations are all in place. All user boundaries are strictly enforced!`;
      } else if (lower.includes('poll')) {
        replyText = `Great question! I just reviewed the options and cast my vote.`;
      } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
        replyText = `Hey there! Delta is running fast and smoothly. How can I help with the testing?`;
      }

      const botMsg: Message = {
        id: `msg-reply-${Date.now()}`,
        conversation_id: convId,
        sender_id: responder.id,
        sender: responder,
        content: replyText,
        type: 'text',
        created_at: new Date().toISOString(),
        status: 'read',
      };

      setMessagesMap((prev) => {
        const updated = [...(prev[convId] || []), botMsg];
        const res = { ...prev, [convId]: updated };
        persistState(conversations, res);
        return res;
      });

      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === convId ? { ...c, updated_at: new Date().toISOString(), last_message: botMsg } : c
        );
        updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        return updated;
      });
    }, 3200);
  };

  // Edit message
  const editMessage = async (messageId: string, newContent: string) => {
    if (!activeConversationId) return;
    setMessagesMap((prev) => {
      const updated = (prev[activeConversationId] || []).map((m) =>
        m.id === messageId
          ? { ...m, content: newContent, is_edited: true, edited_at: new Date().toISOString() }
          : m
      );
      const res = { ...prev, [activeConversationId]: updated };
      persistState(conversations, res);
      return res;
    });
    setEditingMessage(null);
  };

  // Delete message (soft delete)
  const deleteMessage = async (messageId: string) => {
    if (!activeConversationId) return;
    setMessagesMap((prev) => {
      const updated = (prev[activeConversationId] || []).map((m) =>
        m.id === messageId
          ? {
              ...m,
              is_deleted: true,
              deleted_at: new Date().toISOString(),
              content: 'This message was deleted',
              attachments: [],
            }
          : m
      );
      const res = { ...prev, [activeConversationId]: updated };
      persistState(conversations, res);
      return res;
    });
  };

  // React to message with emoji
  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!activeConversationId || !currentUser) return;
    setMessagesMap((prev) => {
      const currentList = prev[activeConversationId] || [];
      const updated = currentList.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = m.reactions || [];
        const existingIdx = reactions.findIndex(
          (r) => r.user_id === currentUser.id && r.emoji === emoji
        );
        let newReactions = [...reactions];
        if (existingIdx >= 0) {
          // Toggle off
          newReactions.splice(existingIdx, 1);
        } else {
          // Add new
          newReactions.push({
            id: `react-${Date.now()}`,
            message_id: messageId,
            user_id: currentUser.id,
            emoji,
            created_at: new Date().toISOString(),
          });
        }
        return { ...m, reactions: newReactions };
      });
      const res = { ...prev, [activeConversationId]: updated };
      persistState(conversations, res);
      return res;
    });
  };

  // Create new conversation
  const createConversation = (targetUserId: string, title?: string, isGroup?: boolean): string => {
    const targetUser = DEMO_PROFILES.find((p) => p.id === targetUserId);
    const existing = conversations.find(
      (c) =>
        !isGroup &&
        c.type === 'direct' &&
        c.members?.some((m) => m.user_id === targetUserId)
    );

    if (existing) {
      setActiveConversationId(existing.id);
      setActiveTab('chats');
      return existing.id;
    }

    const newId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newId,
      type: isGroup ? 'group' : 'direct',
      title: title || targetUser?.display_name || 'New Chat',
      avatar_url: isGroup
        ? 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80'
        : targetUser?.avatar_url,
      created_by: currentUser?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      unread_count: 0,
      members: [
        { id: `m-${Date.now()}-1`, conversation_id: newId, user_id: currentUser?.id || 'user-aarav', role: 'admin', joined_at: new Date().toISOString() },
        { id: `m-${Date.now()}-2`, conversation_id: newId, user_id: targetUserId, role: 'member', joined_at: new Date().toISOString() },
      ],
    };

    const updatedConvs = [newConv, ...conversations];
    setConversations(updatedConvs);
    setMessagesMap((prev) => ({ ...prev, [newId]: [] }));
    persistState(updatedConvs, messagesMap);
    setActiveConversationId(newId);
    setActiveTab('chats');
    return newId;
  };

  // Delta Status creation
  const createStatus = (
    content: string,
    mediaUrl?: string,
    mediaType: 'text' | 'image' | 'video' = 'text',
    bgColor: string = '#4F46E5'
  ) => {
    if (!currentUser) return;
    const newStatus: DeltaStatus = {
      id: `status-${Date.now()}`,
      user_id: currentUser.id,
      user: currentUser,
      content,
      media_url: mediaUrl,
      media_type: mediaType,
      background_color: bgColor,
      privacy: 'everyone',
      expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
      created_at: new Date().toISOString(),
      views_count: 0,
      has_viewed: true,
      views: [],
    };
    const updated = [newStatus, ...statuses];
    setStatuses(updated);
    persistState(conversations, messagesMap, updated);
  };

  // View status receipt
  const viewStatus = (statusId: string) => {
    setStatuses((prev) =>
      prev.map((s) => {
        if (s.id !== statusId) return s;
        if (s.has_viewed) return s;
        return {
          ...s,
          has_viewed: true,
          views_count: (s.views_count || 0) + 1,
        };
      })
    );
  };

  // Poll voting
  const votePoll = (messageId: string, optionId: string) => {
    if (!activeConversationId || !currentUser) return;
    setMessagesMap((prev) => {
      const list = prev[activeConversationId] || [];
      const updated = list.map((m) => {
        if (m.id !== messageId || !m.poll) return m;
        const opts = m.poll.options.map((opt) => {
          if (opt.id === optionId) {
            const hasVoted = !opt.has_voted;
            return {
              ...opt,
              has_voted: hasVoted,
              votes_count: (opt.votes_count || 0) + (hasVoted ? 1 : -1),
            };
          }
          // If single choice, remove vote from others
          if (!m.poll?.is_multiple && opt.has_voted) {
            return {
              ...opt,
              has_voted: false,
              votes_count: Math.max(0, (opt.votes_count || 0) - 1),
            };
          }
          return opt;
        });
        const totalVotes = opts.reduce((acc, o) => acc + (o.votes_count || 0), 0);
        return { ...m, poll: { ...m.poll, options: opts, total_votes: totalVotes } };
      });
      const res = { ...prev, [activeConversationId]: updated };
      persistState(conversations, res);
      return res;
    });
  };

  // WebRTC Audio/Video Call handlers
  const startCall = (targetProfile: Profile, callType: CallType) => {
    const newCall: CallSession = {
      id: `call-${Date.now()}`,
      caller_id: currentUser?.id || 'user-aarav',
      receiver_id: targetProfile.id,
      caller: currentUser || undefined,
      receiver: targetProfile,
      call_type: callType,
      status: 'ringing',
      started_at: new Date().toISOString(),
      duration_seconds: 0,
    };
    setActiveCall(newCall);

    // Simulate call answered after 2.5 seconds
    setTimeout(() => {
      setActiveCall((c) => (c ? { ...c, status: 'connected' } : null));
    }, 2500);
  };

  const endCall = () => {
    setActiveCall(null);
  };

  const toggleMute = () => setIsMuted((prev) => !prev);
  const toggleVideo = () => setIsVideoEnabled((prev) => !prev);

  const clearChat = (convId: string) => {
    setMessagesMap((prev) => {
      const res = { ...prev, [convId]: [] };
      persistState(conversations, res);
      return res;
    });
  };

  const togglePinConversation = (convId: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === convId ? { ...c, is_pinned: !c.is_pinned } : c));
      persistState(updated, messagesMap);
      return updated;
    });
  };

  const toggleMuteConversation = (convId: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === convId ? { ...c, is_muted: !c.is_muted } : c));
      persistState(updated, messagesMap);
      return updated;
    });
  };

  // Contact Sync Implementation
  const syncDeviceContacts = async (): Promise<{ success: boolean; count: number; error?: string }> => {
    let raw: RawContactInput[] = [];
    if (isWebContactsSupported()) {
      try {
        raw = await pickNativeDeviceContacts();
      } catch (err: any) {
        return { success: false, count: 0, error: err.message || 'Failed to access device contacts.' };
      }
    }

    if (raw.length === 0) {
      raw = DEMO_PHONE_ADDRESS_BOOK;
    }

    const currentRaw = syncedContacts.map((c) => ({ name: c.name, phone: c.phone_number }));
    const merged = [...currentRaw, ...raw];
    const matched = matchContactsWithProfiles(merged, availableDemoUsers);
    setSyncedContacts(matched);
    if (typeof window !== 'undefined') {
      localStorage.setItem('delta_synced_contacts', JSON.stringify(matched));
    }
    return { success: true, count: matched.length };
  };

  const importContactsFromFile = async (content: string, type: 'vcf' | 'csv'): Promise<{ count: number; matched: number }> => {
    const raw = type === 'vcf' ? parseVCard(content) : parseCSVContacts(content);
    if (raw.length === 0) {
      return { count: 0, matched: 0 };
    }
    const currentRaw = syncedContacts.map((c) => ({ name: c.name, phone: c.phone_number }));
    const merged = [...currentRaw, ...raw];
    const matched = matchContactsWithProfiles(merged, availableDemoUsers);
    setSyncedContacts(matched);
    if (typeof window !== 'undefined') {
      localStorage.setItem('delta_synced_contacts', JSON.stringify(matched));
    }
    const deltaCount = matched.filter((c) => c.is_on_delta).length;
    return { count: matched.length, matched: deltaCount };
  };

  const addContactByPhone = async (name: string, phoneNumber: string): Promise<{ matchedUser?: Profile }> => {
    const raw: RawContactInput = { name: name.trim(), phone: phoneNumber.trim() };
    const currentRaw = syncedContacts.map((c) => ({ name: c.name, phone: c.phone_number }));
    const merged = [raw, ...currentRaw];
    const matched = matchContactsWithProfiles(merged, availableDemoUsers);
    setSyncedContacts(matched);
    if (typeof window !== 'undefined') {
      localStorage.setItem('delta_synced_contacts', JSON.stringify(matched));
    }
    const found = matched.find((c) => c.phone_number === phoneNumber);
    return { matchedUser: found?.delta_profile };
  };

  const removeSyncedContact = (id: string) => {
    const updated = syncedContacts.filter((c) => c.id !== id);
    setSyncedContacts(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('delta_synced_contacts', JSON.stringify(updated));
    }
  };

  const syncSampleAddressBook = () => {
    const matched = matchContactsWithProfiles(DEMO_PHONE_ADDRESS_BOOK, availableDemoUsers);
    setSyncedContacts(matched);
    if (typeof window !== 'undefined') {
      localStorage.setItem('delta_synced_contacts', JSON.stringify(matched));
    }
  };

  return (
    <MessagingContext.Provider
      value={{
        conversations,
        activeConversation,
        activeConversationId,
        messages: currentMessages,
        statuses,
        channels,
        communities,
        isTyping,
        activeCall,
        searchFilter,
        activeTab,
        setActiveTab,
        setActiveConversationId,
        setSearchFilter,
        sendMessage,
        editMessage,
        deleteMessage,
        reactToMessage,
        replyingToMessage,
        setReplyingToMessage,
        editingMessage,
        setEditingMessage,
        markAsRead,
        createConversation,
        createStatus,
        viewStatus,
        votePoll,
        startCall,
        endCall,
        toggleMute,
        toggleVideo,
        isMuted,
        isVideoEnabled,
        clearChat,
        togglePinConversation,
        toggleMuteConversation,
        // Contact sync
        syncedContacts,
        isContactsPickerSupported,
        syncDeviceContacts,
        importContactsFromFile,
        addContactByPhone,
        removeSyncedContact,
        syncSampleAddressBook,
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
}
