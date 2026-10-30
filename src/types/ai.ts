import { MessageType, Profile } from './index';

export type AiProvider = 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'mock';

export type LanguageDialect = 'tanglish' | 'hinglish' | 'spanglish' | 'english' | 'tamil' | 'hindi';

export type FormalityLevel = 'casual' | 'chill_slang' | 'gen_z' | 'corporate' | 'academic';

export type EmojiIntensity = 'none' | 'subtle' | 'expressive';

export type SmartReplyIntent = 'affirmative' | 'negative' | 'counter_or_playful' | 'custom';

export type MealStatus = 'had_lunch' | 'not_yet' | 'auto_schedule';

export interface UserRoutineState {
  mealStatus: MealStatus;
  mealStatusUpdatedAt?: string;
  isAiAutoPilot: boolean;
  geminiApiKey?: string;
}

export interface UserVoiceProfile {
  userId: string;
  formality: FormalityLevel;
  primaryLanguage: LanguageDialect;
  slangKeywords: string[];          // e.g. ["macha", "da", "semma", "kandippa", "bro", "yaar", "sorted"]
  capitalization: 'normal' | 'all_lowercase' | 'uppercase_emphasis';
  emojiIntensity: EmojiIntensity;
  samplePhrases: string[];           // Few-shot reference messages from user
  customInstructions?: string;       // e.g. "Always keep replies under 12 words"
}

export interface SmartReplyOption {
  id: string;
  intent: SmartReplyIntent;
  label: string; // e.g. "Yes / Agreed", "No / Busy", "Counter / Later"
  text: string;
  emoji?: string;
}

export interface ScheduledAiTask {
  id: string;
  type: 'send_message' | 'reminder';
  recipientName: string;
  recipientUserId?: string;
  recipientConversationId?: string;
  content: string;
  scheduledTimeStr: string;          // e.g. "3:02 PM", "tomorrow 10 AM"
  targetTimestamp: number;          // Epoch milliseconds
  status: 'pending' | 'sent' | 'cancelled';
  createdAt: string;
  sentAt?: string;
  metadata?: Record<string, any>;
}

export interface AiCommandParseResult {
  isCommand: boolean;
  intent: 'schedule_message' | 'set_reminder' | 'summarize_thread' | 'general_chat' | 'unknown';
  task?: Omit<ScheduledAiTask, 'id' | 'createdAt' | 'status'>;
  responseText: string;
  confidence: number;
}

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface AiGenerateRequest {
  model?: string;
  prompt: string;
  messages?: AiChatMessage[];
  context?: {
    conversationId?: string;
    senderProfile?: Partial<Profile>;
    recipientProfile?: Partial<Profile>;
    userVoiceProfile?: Partial<UserVoiceProfile>;
    recentMessages?: { sender: string; text: string; timestamp?: string }[];
  };
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  responseFormat?: 'text' | 'json';
}

export interface AiGenerateResponse {
  id: string;
  provider: AiProvider;
  model: string;
  output: string;
  finishReason?: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
    savedVsCommercialUsd: number; // Delta $0 ledger savings
  };
  smartReplies?: SmartReplyOption[];
  parsedCommand?: AiCommandParseResult;
  createdAt: string;
}

export interface ThreadSummaryResult {
  conversationId: string;
  conversationTitle: string;
  messageCountAnalyzed: number;
  bulletPoints: string[];
  actionItems: string[];
  sentimentOverview: 'positive' | 'neutral' | 'urgent' | 'mixed';
  executiveSummary: string;
}

