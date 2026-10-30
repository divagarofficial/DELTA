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
  SatelliteTelemetry,
} from '@/types';
import {
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  DELTA_AI_PROFILE,
  DEMO_STATUSES,
  DEMO_CHANNELS,
  DEMO_COMMUNITIES,
} from '@/data/mockData';
import { businessStore } from '@/lib/business/businessStore';
import { useAuth } from './AuthContext';
import { createClient } from '@/lib/supabase/client';
import { formatDuration } from '@/lib/utils';
import { callAudio } from '@/lib/callAudio';
import { ScheduledAiTask, UserVoiceProfile, SmartReplyOption, MealStatus } from '@/types/ai';
import {
  DEFAULT_USER_VOICE_PROFILE,
  processDeltaAiMessage,
  generateSmartReplies,
  getAutoReplyForFoodInquiry,
  simulateBusinessAiCustomerSupport,
} from '@/lib/ai/deltaAiEngine';
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
  metadata?: Record<string, any>;
  customSender?: Profile;
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
  activeTab: 'chats' | 'status' | 'channels' | 'communities' | 'business' | 'settings';
  setActiveTab: (tab: 'chats' | 'status' | 'channels' | 'communities' | 'business' | 'settings') => void;
  setActiveConversationId: (id: string | null) => void;
  setSearchFilter: (query: string) => void;
  sendMessage: (content: string, type?: MessageType, options?: SendMessageOptions) => Promise<void>;
  sendBusinessApiMessage: (targetConvId: string, payload: {
    content: string;
    type?: MessageType;
    metadata?: Record<string, any>;
    attachments?: any[];
  }) => Promise<void>;
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
  endCall: (durationSeconds?: number) => void;
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
  // Satellite Direct-to-Cell (3GPP Rel-17 NTN)
  isSatelliteMode: boolean;
  satelliteTelemetry: SatelliteTelemetry;
  showSatelliteRadar: boolean;
  setShowSatelliteRadar: (show: boolean) => void;
  toggleSatelliteMode: () => void;
  // AI Messenger Engine
  scheduledTasks: ScheduledAiTask[];
  userVoiceProfile: UserVoiceProfile;
  setUserVoiceProfile: (profile: UserVoiceProfile) => void;
  scheduleAiTask: (task: Omit<ScheduledAiTask, 'id' | 'createdAt' | 'status'>) => ScheduledAiTask;
  cancelScheduledTask: (taskId: string) => void;
  executeScheduledTaskNow: (taskId: string) => void;
  activeSmartReplies: SmartReplyOption[];
  applySmartReply: (reply: SmartReplyOption) => void;
  mealStatus: MealStatus;
  setMealStatus: (status: MealStatus) => void;
  isAiAutoPilot: boolean;
  toggleAiAutoPilot: () => void;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

const DEFAULT_SATELLITE_TELEMETRY: SatelliteTelemetry = {
  satellite_id: 'STARLINK-V2M-3841',
  constellation: 'Direct-to-Cell LEO (3GPP Rel-17 NTN)',
  elevation_deg: 54.2,
  azimuth_deg: 218.4,
  signal_quality: 'optimal',
  latency_ms: 780,
};

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, isConfigured, availableDemoUsers } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [statuses, setStatuses] = useState<DeltaStatus[]>(DEMO_STATUSES);
  const [channels, setChannels] = useState<Channel[]>(DEMO_CHANNELS);
  const [communities] = useState<Community[]>(DEMO_COMMUNITIES);
  const [isTyping, setIsTyping] = useState<Record<string, string[]>>({});
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'channels' | 'communities' | 'business' | 'settings'>('chats');
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Satellite Direct-to-Cell state
  const [isSatelliteMode, setIsSatelliteMode] = useState<boolean>(false);
  const [showSatelliteRadar, setShowSatelliteRadar] = useState<boolean>(false);
  const [satelliteTelemetry, setSatelliteTelemetry] = useState<SatelliteTelemetry>(DEFAULT_SATELLITE_TELEMETRY);

  const toggleSatelliteMode = useCallback(() => {
    setIsSatelliteMode((prev) => {
      const next = !prev;
      if (next) {
        callAudio.playSatelliteUplinkTone();
      }
      return next;
    });
  }, []);

  // Phone Contact Sync State
  const [syncedContacts, setSyncedContacts] = useState<SyncedPhoneContact[]>([]);
  const [isContactsPickerSupported, setIsContactsPickerSupported] = useState(false);

  // Call state
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // AI Messenger Engine State
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledAiTask[]>([]);
  const [userVoiceProfile, setUserVoiceProfileState] = useState<UserVoiceProfile>(DEFAULT_USER_VOICE_PROFILE);
  const [activeSmartReplies, setActiveSmartReplies] = useState<SmartReplyOption[]>([]);
  const [mealStatus, setMealStatusState] = useState<MealStatus>('auto_schedule');
  const [isAiAutoPilot, setIsAiAutoPilot] = useState<boolean>(true);

  const setMealStatus = useCallback((status: MealStatus) => {
    setMealStatusState(status);
    if (typeof window !== 'undefined') {
      localStorage.setItem('delta_meal_status', status);
    }
  }, []);

  const toggleAiAutoPilot = useCallback(() => {
    setIsAiAutoPilot((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('delta_ai_autopilot', String(next));
      }
      return next;
    });
  }, []);

  const setUserVoiceProfile = useCallback((profile: UserVoiceProfile) => {
    setUserVoiceProfileState(profile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('delta_user_voice', JSON.stringify(profile));
    }
  }, []);

  // Load from localStorage in browser if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsContactsPickerSupported(isWebContactsSupported());
      const storedConvs = localStorage.getItem('delta_conversations');
      const storedMsgs = localStorage.getItem('delta_messages');
      const storedStatuses = localStorage.getItem('delta_statuses');
      const storedTasks = localStorage.getItem('delta_scheduled_tasks');
      const storedVoice = localStorage.getItem('delta_user_voice');

      if (storedTasks) {
        try { setScheduledTasks(JSON.parse(storedTasks)); } catch (e) { console.error(e); }
      }
      if (storedVoice) {
        try { setUserVoiceProfileState(JSON.parse(storedVoice)); } catch (e) { console.error(e); }
      }
      const storedMealStatus = localStorage.getItem('delta_meal_status');
      if (storedMealStatus) {
        setMealStatusState(storedMealStatus as MealStatus);
      }
      const storedAutoPilot = localStorage.getItem('delta_ai_autopilot');
      if (storedAutoPilot !== null) {
        setIsAiAutoPilot(storedAutoPilot === 'true');
      }

      if (storedConvs) {
        try {
          const parsed: Conversation[] = JSON.parse(storedConvs);
          const migrated = parsed
            .map((c) =>
              c.avatar_url === '/delta-logo.svg' || c.avatar_url?.endsWith('.svg')
                ? { ...c, avatar_url: '/delta_logo_without_text.png' }
                : c
            )
            .filter(
              (c) =>
                !['conv-priya', 'conv-arjun', 'conv-diva', 'conv-group-core', 'conv-channel-official'].includes(c.id)
            );
          setConversations(migrated);
        } catch (e) { console.error(e); }
      }
      if (storedMsgs) {
        try {
          const parsed = JSON.parse(storedMsgs);
          delete parsed['conv-priya'];
          delete parsed['conv-arjun'];
          delete parsed['conv-diva'];
          delete parsed['conv-group-core'];
          delete parsed['conv-channel-official'];
          setMessagesMap(parsed);
        } catch (e) { console.error(e); }
      }
      if (storedStatuses) {
        try {
          const parsed = JSON.parse(storedStatuses);
          const filtered = Array.isArray(parsed)
            ? parsed.filter((s: any) => !['status-priya-1', 'status-arjun-1', 'status-rohit-1'].includes(s.id))
            : [];
          setStatuses(filtered);
        } catch (e) { console.error(e); }
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

  // Cross-tab & Real-time multi-window synchronization
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    const bc = new BroadcastChannel('delta_realtime_sync');
    bc.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'NEW_MESSAGE' && data.convId && data.message) {
        setMessagesMap((prev) => {
          const currentList = prev[data.convId] || [];
          if (currentList.some((m) => m.id === data.message.id)) return prev;
          return { ...prev, [data.convId]: [...currentList, data.message] };
        });

        setConversations((prev) => {
          const updated = prev.map((c) =>
            c.id === data.convId
              ? {
                  ...c,
                  updated_at: data.message.created_at,
                  last_message: data.message,
                  unread_count:
                    c.id !== activeConversationId ? (c.unread_count || 0) + 1 : c.unread_count,
                }
              : c
          );
          return [...updated].sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        });
      } else if (data.type === 'MESSAGE_STATUS' && data.convId && data.messageId) {
        setMessagesMap((prev) => {
          const currentList = prev[data.convId] || [];
          const updated = currentList.map((m) =>
            m.id === data.messageId ? { ...m, status: data.status, is_optimistic: false } : m
          );
          return { ...prev, [data.convId]: updated };
        });
      }
    };

    return () => {
      bc.close();
    };
  }, [activeConversationId]);

  // Synchronize incoming Business API messages (from external cURL, ERP, Python, or Webhooks)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkIncomingBusinessMessages = () => {
      try {
        const queued = businessStore.getPendingIncomingMessages();
        if (queued && queued.length > 0) {
          queued.forEach((item) => {
            const cleanTo = item.to.replace(/[^0-9]/g, '');
            let targetConv = conversations.find(
              (c) =>
                c.id === item.to ||
                (c.title && c.title.replace(/[^0-9]/g, '').endsWith(cleanTo.slice(-10)))
            );

            const convId = targetConv ? targetConv.id : (conversations[0]?.id || 'conv-1');
            const bizProfile = businessStore.getProfile();
            const newMsg: Message = {
              id: item.id,
              conversation_id: convId,
              sender_id: bizProfile.id,
              sender: {
                id: bizProfile.id,
                username: 'apex_business',
                display_name: bizProfile.business_name,
                avatar_url: bizProfile.avatar_url,
                phone_number: bizProfile.phone_number,
                status_message: 'Verified Delta Business',
              },
              content: item.content,
              type: (item.type as any) || 'text',
              created_at: item.timestamp,
              status: 'delivered',
              metadata: item.metadata,
              attachments: item.attachments,
            };

            setMessagesMap((prev) => {
              const existing = prev[convId] || [];
              if (existing.some((m) => m.id === newMsg.id)) return prev;
              return { ...prev, [convId]: [...existing, newMsg] };
            });

            setConversations((prev) =>
              prev.map((c) =>
                c.id === convId
                  ? {
                      ...c,
                      last_message: newMsg,
                      updated_at: newMsg.created_at,
                      unread_count: c.id !== activeConversationId ? (c.unread_count || 0) + 1 : 0,
                    }
                  : c
              )
            );
          });

          businessStore.clearPendingIncomingMessages();
        }
      } catch (e) {
        // Safe catch
      }
    };

    const interval = setInterval(checkIncomingBusinessMessages, 1000);
    return () => clearInterval(interval);
  }, [conversations, activeConversationId]);

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

  // Schedule a new AI Task
  const scheduleAiTask = useCallback((taskData: Omit<ScheduledAiTask, 'id' | 'createdAt' | 'status'>): ScheduledAiTask => {
    const newTask: ScheduledAiTask = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setScheduledTasks((prev) => {
      const updated = [...prev, newTask];
      if (typeof window !== 'undefined') {
        localStorage.setItem('delta_scheduled_tasks', JSON.stringify(updated));
      }
      return updated;
    });
    return newTask;
  }, []);

  // Cancel a scheduled AI Task
  const cancelScheduledTask = useCallback((taskId: string) => {
    setScheduledTasks((prev) => {
      const updated = prev.map((t) => (t.id === taskId ? { ...t, status: 'cancelled' as const } : t));
      if (typeof window !== 'undefined') {
        localStorage.setItem('delta_scheduled_tasks', JSON.stringify(updated));
      }
      return updated;
    });

    const cancelMsg: Message = {
      id: `msg-ai-cancel-${Date.now()}`,
      conversation_id: 'conv-delta-ai',
      sender_id: 'user-delta-ai',
      sender: DELTA_AI_PROFILE,
      content: `❌ Cancelled scheduled task #${taskId.slice(-4)}. It will not be sent.`,
      type: 'text',
      created_at: new Date().toISOString(),
      status: 'read',
    };

    setMessagesMap((mMap) => ({
      ...mMap,
      ['conv-delta-ai']: [...(mMap['conv-delta-ai'] || []), cancelMsg],
    }));
  }, []);

  // Immediately execute a scheduled AI Task now
  const executeScheduledTaskNow = useCallback((taskId: string) => {
    setScheduledTasks((prev) => {
      const updated = prev.map((t) => (t.id === taskId ? { ...t, targetTimestamp: Date.now() - 1000 } : t));
      return updated;
    });
  }, []);

  // Background automated execution loop for scheduled messages & reminders (ticks every 1s)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setScheduledTasks((prev) => {
        let changed = false;
        const updated = prev.map((task) => {
          if (task.status === 'pending' && task.targetTimestamp <= now) {
            changed = true;
            // Execute the scheduled task
            if (task.type === 'send_message') {
              // Find target conversation
              const targetConv = conversations.find(
                (c) =>
                  c.id === task.recipientConversationId ||
                  c.title?.toLowerCase().includes(task.recipientName.toLowerCase())
              );
              const targetConvId = targetConv ? targetConv.id : 'conv-delta-ai';

              // Dispatch message into the recipient conversation
              const autoMsg: Message = {
                id: `msg-auto-${Date.now()}`,
                conversation_id: targetConvId,
                sender_id: currentUser?.id || 'sender',
                sender: currentUser || undefined,
                content: task.content,
                type: 'text',
                created_at: new Date().toISOString(),
                status: 'delivered',
              };

              setMessagesMap((mMap) => ({
                ...mMap,
                [targetConvId]: [...(mMap[targetConvId] || []), autoMsg],
              }));

              // Send confirmation notification into Delta AI chat
              const notifyMsg: Message = {
                id: `msg-ai-notify-${Date.now()}`,
                conversation_id: 'conv-delta-ai',
                sender_id: 'user-delta-ai',
                sender: DELTA_AI_PROFILE,
                content: `🚀 **Auto-Dispatched at ${task.scheduledTimeStr}:** Successfully sent "${task.content}" to ${task.recipientName}!`,
                type: 'text',
                created_at: new Date().toISOString(),
                status: 'read',
              };

              setMessagesMap((mMap) => ({
                ...mMap,
                ['conv-delta-ai']: [...(mMap['conv-delta-ai'] || []), notifyMsg],
              }));
            } else if (task.type === 'reminder') {
              // Notification for reminder
              const reminderMsg: Message = {
                id: `msg-ai-remind-${Date.now()}`,
                conversation_id: 'conv-delta-ai',
                sender_id: 'user-delta-ai',
                sender: DELTA_AI_PROFILE,
                content: `🔔 **Scheduled Reminder Triggered:** ${task.content}!`,
                type: 'text',
                created_at: new Date().toISOString(),
                status: 'read',
              };

              setMessagesMap((mMap) => ({
                ...mMap,
                ['conv-delta-ai']: [...(mMap['conv-delta-ai'] || []), reminderMsg],
              }));
            }

            return { ...task, status: 'sent' as const, sentAt: new Date().toISOString() };
          }
          return task;
        });

        if (changed && typeof window !== 'undefined') {
          localStorage.setItem('delta_scheduled_tasks', JSON.stringify(updated));
        }
        return changed ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [conversations, currentUser]);

  // Compute 3-Intent Smart Replies when viewing a conversation
  useEffect(() => {
    if (!activeConversationId || activeConversationId === 'conv-delta-ai') {
      setActiveSmartReplies([]);
      return;
    }

    const currentMsgs = messagesMap[activeConversationId] || [];
    if (currentMsgs.length === 0) {
      setActiveSmartReplies([]);
      return;
    }

    const lastMsg = currentMsgs[currentMsgs.length - 1];
    // Only suggest replies if the last message was from someone else
    if (lastMsg && lastMsg.sender_id !== currentUser?.id && lastMsg.type === 'text') {
      const options = generateSmartReplies(lastMsg.content, userVoiceProfile);
      setActiveSmartReplies(options);
    } else {
      setActiveSmartReplies([]);
    }
  }, [activeConversationId, messagesMap, currentUser, userVoiceProfile]);

  // Apply a smart reply (send it directly into conversation)
  const applySmartReply = useCallback((reply: SmartReplyOption) => {
    if (!activeConversationId) return;
    sendMessage(reply.text);
  }, [activeConversationId]);

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
      sender_id: options?.customSender?.id || currentUser.id,
      sender: options?.customSender || currentUser,
      content,
      type,
      created_at: nowIso,
      status: 'sent',
      is_optimistic: true,
      metadata: options?.metadata,
      is_satellite: isSatelliteMode,
      satellite_meta: isSatelliteMode ? { ...satelliteTelemetry } : null,
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

    if (isSatelliteMode) {
      callAudio.playSatelliteUplinkTone();
    }

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

    // Broadcast to other open tabs / windows in real-time
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('delta_realtime_sync');
        bc.postMessage({
          type: 'NEW_MESSAGE',
          convId: activeConversationId,
          message: optimisticMsg,
        });
        bc.close();
      } catch (e) { console.error(e); }
    }

    // In Demo Mode: Simulate realistic Delivery & Read receipts progression
    setTimeout(() => {
      setMessagesMap((prev) => ({
        ...prev,
        [activeConversationId]: (prev[activeConversationId] || []).map((m) =>
          m.id === tempId ? { ...m, is_optimistic: false, status: 'delivered' } : m
        ),
      }));
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('delta_realtime_sync');
          bc.postMessage({ type: 'MESSAGE_STATUS', convId: activeConversationId, messageId: tempId, status: 'delivered' });
          bc.close();
        } catch (e) {}
      }
    }, 700);

    setTimeout(() => {
      setMessagesMap((prev) => ({
        ...prev,
        [activeConversationId]: (prev[activeConversationId] || []).map((m) =>
          m.id === tempId ? { ...m, status: 'read' } : m
        ),
      }));
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('delta_realtime_sync');
          bc.postMessage({ type: 'MESSAGE_STATUS', convId: activeConversationId, messageId: tempId, status: 'read' });
          bc.close();
        } catch (e) {}
      }
    }, 1800);

    // In Demo Mode: Trigger intelligent simulated conversational reply strictly from the correct person
    const targetConv = conversations.find((c) => c.id === activeConversationId);
    if (targetConv && targetConv.type !== 'channel') {
      simulateDemoReply(activeConversationId, content, targetConv);
    }
  };

  // Simulated intelligent persona reply strictly from the conversation recipient
  const simulateDemoReply = (convId: string, userMsg: string, conv: Conversation) => {
    // 0. Ambient @delta AI Copilot Trigger across ANY conversation (groups, channels, direct)
    const lowerUserMsg = userMsg.toLowerCase();
    if (convId !== 'conv-delta-ai' && (lowerUserMsg.includes('@delta') || lowerUserMsg.includes('@ai'))) {
      setIsTyping((prev) => ({ ...prev, [convId]: ['Delta AI'] }));

      setTimeout(async () => {
        setIsTyping((prev) => {
          const copy = { ...prev };
          delete copy[convId];
          return copy;
        });

        const cleanPrompt = userMsg.replace(/@delta|@ai/gi, '').trim();
        const contactsList = conversations.map((c) => ({
          id: c.id,
          name: c.title || 'Contact',
          conversationId: c.id,
        }));

        const result = await processDeltaAiMessage(cleanPrompt || 'How can I assist this conversation?', {
          contacts: contactsList,
          currentMealStatus: mealStatus,
        });

        if (result.task) {
          scheduleAiTask(result.task);
        }

        const aiMsg: Message = {
          id: `msg-ai-ambient-${Date.now()}`,
          conversation_id: convId,
          sender_id: 'user-delta-ai',
          sender: DELTA_AI_PROFILE,
          content: `✨ **@Delta AI:** ${result.text}`,
          type: 'text',
          created_at: new Date().toISOString(),
          status: 'delivered',
          metadata: result.task ? { aiTask: result.task } : undefined,
        };

        setMessagesMap((prev) => ({
          ...prev,
          [convId]: [...(prev[convId] || []), aiMsg],
        }));
      }, 750);
      return;
    }

    // 1. Delta AI Autonomous Copilot Conversation
    if (convId === 'conv-delta-ai') {
      setIsTyping((prev) => ({ ...prev, ['conv-delta-ai']: ['Delta AI'] }));

      setTimeout(async () => {
        setIsTyping((prev) => {
          const copy = { ...prev };
          delete copy['conv-delta-ai'];
          return copy;
        });

        const contactsList = conversations.map((c) => ({
          id: c.id,
          name: c.title || 'Contact',
          conversationId: c.id,
        }));

        const result = await processDeltaAiMessage(userMsg, {
          contacts: contactsList,
          currentMealStatus: mealStatus,
        });

        if (result.updatedMealStatus) {
          setMealStatus(result.updatedMealStatus);
        }

        if (result.task) {
          scheduleAiTask(result.task);
        }

        const aiMsg: Message = {
          id: `msg-ai-${Date.now()}`,
          conversation_id: 'conv-delta-ai',
          sender_id: 'user-delta-ai',
          sender: DELTA_AI_PROFILE,
          content: result.text,
          type: 'text',
          created_at: new Date().toISOString(),
          status: 'read',
          metadata: result.task ? { aiTask: result.task } : undefined,
        };

        setMessagesMap((prev) => ({
          ...prev,
          ['conv-delta-ai']: [...(prev['conv-delta-ai'] || []), aiMsg],
        }));
      }, 700);
      return;
    }
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
    const targetUser = availableDemoUsers.find((p) => p.id === targetUserId);
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
        { id: `m-${Date.now()}-1`, conversation_id: newId, user_id: currentUser?.id || 'admin', role: 'admin', joined_at: new Date().toISOString() },
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
      caller_id: currentUser?.id || 'caller',
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

  const endCall = (durationSeconds: number = 0) => {
    if (activeCall && activeConversation) {
      const isVideo = activeCall.call_type === 'video';
      const durationLabel = durationSeconds > 0 ? ` (${formatDuration(durationSeconds)})` : '';
      const callMsg: Message = {
        id: `msg-call-${Date.now()}`,
        conversation_id: activeConversation.id,
        sender_id: currentUser?.id || 'caller',
        content: `${isVideo ? '📹 Video Call' : '📞 Voice Call'}${durationLabel}`,
        type: 'call',
        created_at: new Date().toISOString(),
        status: 'read',
      };
      setMessagesMap((prev) => {
        const list = prev[activeConversation.id] || [];
        const updated = [...list, callMsg];
        persistState(conversations, { ...prev, [activeConversation.id]: updated });
        return { ...prev, [activeConversation.id]: updated };
      });
    }
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

  const sendBusinessApiMessage = useCallback(
    async (
      targetConvId: string,
      payload: {
        content: string;
        type?: MessageType;
        metadata?: Record<string, any>;
        attachments?: any[];
      }
    ) => {
      const bizProfile = businessStore.getProfile();
      const tempId = `deltamid.${Date.now()}`;
      const nowIso = new Date().toISOString();

      const businessSender: Profile = {
        id: bizProfile.id,
        username: 'apex_business',
        display_name: bizProfile.business_name,
        avatar_url: bizProfile.avatar_url,
        phone_number: bizProfile.phone_number,
        status_message: 'Verified Delta Business',
      };

      const newMsg: Message = {
        id: tempId,
        conversation_id: targetConvId,
        sender_id: businessSender.id,
        sender: businessSender,
        content: payload.content,
        type: payload.type || 'text',
        created_at: nowIso,
        status: 'delivered',
        metadata: {
          ...payload.metadata,
          business: {
            is_business: true,
            verified: true,
            business_name: bizProfile.business_name,
            zero_charge: true,
            cost: '0.00',
            currency: 'INR',
          },
        },
        attachments: payload.attachments,
      };

      setMessagesMap((prev) => {
        const currentList = prev[targetConvId] || [];
        const nextList = [...currentList, newMsg];
        return { ...prev, [targetConvId]: nextList };
      });

      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === targetConvId
            ? { ...c, last_message: newMsg, updated_at: nowIso }
            : c
        );
        return [...updated].sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });

      callAudio.playMessageSentTone();
    },
    []
  );

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
        sendBusinessApiMessage,
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
        // Satellite Direct-to-Cell
        isSatelliteMode,
        satelliteTelemetry,
        showSatelliteRadar,
        setShowSatelliteRadar,
        toggleSatelliteMode,
        // AI Messenger Engine
        scheduledTasks,
        userVoiceProfile,
        setUserVoiceProfile,
        scheduleAiTask,
        cancelScheduledTask,
        executeScheduledTaskNow,
        activeSmartReplies,
        applySmartReply,
        mealStatus,
        setMealStatus,
        isAiAutoPilot,
        toggleAiAutoPilot,
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
