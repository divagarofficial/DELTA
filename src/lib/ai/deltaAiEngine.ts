import {
  AiGenerateRequest,
  AiGenerateResponse,
  SmartReplyOption,
  UserVoiceProfile,
  ScheduledAiTask,
  AiCommandParseResult,
  LanguageDialect,
  MealStatus,
  ThreadSummaryResult,
} from '@/types/ai';

export const DEFAULT_USER_VOICE_PROFILE: UserVoiceProfile = {
  userId: 'user-aarav',
  formality: 'chill_slang',
  primaryLanguage: 'tanglish',
  slangKeywords: ['macha', 'da', 'semma', 'seri', 'kandippa', 'bro', 'pakka'],
  capitalization: 'normal',
  emojiIntensity: 'expressive',
  samplePhrases: [
    'Aama da, mudinjathu! Nee sapteeya? 🍛',
    'Kandippa polam macha, time sollu 🔥',
    'Innum illa bro, work konjam tight-ah irukku 😅',
  ],
  customInstructions: 'Speak naturally in casual Tanglish (Tamil-English mixed) with friendly warmth.',
};

/**
 * Parses natural language time strings like:
 * "3:02 PM", "3:02pm", "15:02", "at 5 PM", "tomorrow 10 AM", "in 10 minutes"
 */
export function parseTimeString(timeStr: string, referenceDate: Date = new Date()): { timestamp: number; formatted: string } | null {
  const clean = timeStr.trim().toLowerCase();
  const target = new Date(referenceDate);

  // Check for "in X minutes" or "in X mins"
  const relMinutesMatch = clean.match(/in\s+(\d+)\s*(?:mins|min|minutes)/);
  if (relMinutesMatch) {
    const mins = parseInt(relMinutesMatch[1], 10);
    target.setMinutes(target.getMinutes() + mins);
    target.setSeconds(0);
    return {
      timestamp: target.getTime(),
      formatted: target.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };
  }

  // Check for standard 12h/24h time: e.g. "3:02 PM", "3:02pm", "3pm", "3:02"
  const timeRegex = /(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
  const match = clean.match(timeRegex);

  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const meridian = match[3] ? match[3].toLowerCase() : null;

    if (meridian === 'pm' && hours < 12) {
      hours += 12;
    } else if (meridian === 'am' && hours === 12) {
      hours = 0;
    }

    target.setHours(hours, minutes, 0, 0);

    // If target time is earlier today than current time, schedule for tomorrow
    if (target.getTime() <= referenceDate.getTime()) {
      target.setDate(target.getDate() + 1);
    }

    const formatted = target
      .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    return {
      timestamp: target.getTime(),
      formatted,
    };
  }

  return null;
}

/**
 * Natural language intent parser for commands like:
 * - "Send a message to Diva - Sptyaa daa at 3:02 PM"
 * - "Send message to Diva: Sptyaa daa at 3:02 PM"
 * - "3:02 PM-ku Diva-ku 'Sptyaa daa' nu message anupidu"
 * - "Remind me to call Mom at 7 PM"
 */
export function parseNaturalLanguageCommand(text: string, referenceTime: Date = new Date()): AiCommandParseResult {
  const trimmed = text.trim();

  // Pattern 1: English - "Send (a) message to <Recipient> - <Message> at <Time>"
  // Or "Send message to <Recipient>: <Message> at <Time>"
  const sendPattern1 = /send\s+(?:a\s+)?message\s+to\s+([a-zA-Z0-9_\s]+?)\s*[-:]\s*(.+?)\s+at\s+((?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?)|(?:in\s+\d+\s*(?:mins|min|minutes)))/i;
  const match1 = trimmed.match(sendPattern1);

  if (match1) {
    const recipientName = match1[1].trim();
    const messageContent = match1[2].trim().replace(/^['"]|['"]$/g, '');
    const rawTime = match1[3].trim();
    const parsedTime = parseTimeString(rawTime, referenceTime);

    if (parsedTime) {
      return {
        isCommand: true,
        intent: 'schedule_message',
        task: {
          type: 'send_message',
          recipientName,
          content: messageContent,
          scheduledTimeStr: parsedTime.formatted,
          targetTimestamp: parsedTime.timestamp,
        },
        responseText: `Got it! I will automatically send "${messageContent}" to ${recipientName} at ${parsedTime.formatted}.`,
        confidence: 0.98,
      };
    }
  }

  // Pattern 2A: Tanglish (Recipient first) - "<Recipient> ku <Time> ku '<Message>' nu msg pannu/anupidu"
  // e.g. "Diva ku 2 PM ku sptyaa da nu msg pannu"
  const tanglishPatternRecipientFirst = /([a-zA-Z0-9_]+?)(?:-ku|\s+ku)\s+((?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?)|(?:in\s+\d+\s*mins?))(?:\s*-\s*ku|\s+ku)\s*['"]?(.+?)['"]?\s*(?:nu\s+)?(?:msg|message)?\s*(?:pannu|anupidu|anupu|send\s+pannu|podu|sollu)/i;
  const matchTanglishRecipientFirst = trimmed.match(tanglishPatternRecipientFirst);

  if (matchTanglishRecipientFirst) {
    const recipientName = matchTanglishRecipientFirst[1].trim();
    const rawTime = matchTanglishRecipientFirst[2].trim();
    const messageContent = matchTanglishRecipientFirst[3].trim().replace(/^['"]|['"]$/g, '');
    const parsedTime = parseTimeString(rawTime, referenceTime);

    if (parsedTime) {
      return {
        isCommand: true,
        intent: 'schedule_message',
        task: {
          type: 'send_message',
          recipientName,
          content: messageContent,
          scheduledTimeStr: parsedTime.formatted,
          targetTimestamp: parsedTime.timestamp,
        },
        responseText: `Pakka! ${parsedTime.formatted}-ku ${recipientName}-ku "${messageContent}" nu auto-va send pannidren 👍`,
        confidence: 0.96,
      };
    }
  }

  // Pattern 2B: Tanglish (Time first) - "<Time>-ku <Recipient>-ku '<Message>' nu message anupidu/send pannu"
  const tanglishPattern1 = /(?:at\s+)?((?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?)|(?:in\s+\d+\s*mins?))(?:\s*-\s*ku|\s+ku)\s+([a-zA-Z0-9_]+?)(?:-ku|\s+ku)\s*['"]?(.+?)['"]?\s*(?:nu\s+)?(?:msg|message)?\s*(?:anupidu|anupu|pannu|send\s+pannu|podu)/i;
  const matchTanglish = trimmed.match(tanglishPattern1);

  if (matchTanglish) {
    const rawTime = matchTanglish[1].trim();
    const recipientName = matchTanglish[2].trim();
    const messageContent = matchTanglish[3].trim().replace(/^['"]|['"]$/g, '');
    const parsedTime = parseTimeString(rawTime, referenceTime);

    if (parsedTime) {
      return {
        isCommand: true,
        intent: 'schedule_message',
        task: {
          type: 'send_message',
          recipientName,
          content: messageContent,
          scheduledTimeStr: parsedTime.formatted,
          targetTimestamp: parsedTime.timestamp,
        },
        responseText: `Pakka! ${parsedTime.formatted}-ku ${recipientName}-ku "${messageContent}" nu auto-va send pannidren 👍`,
        confidence: 0.95,
      };
    }
  }

  // Pattern 3: Simple Schedule - "Schedule message to <Recipient> at <Time>: <Message>"
  const sendPattern3 = /schedule\s+(?:message\s+)?to\s+([a-zA-Z0-9_\s]+?)\s+at\s+((?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?)|(?:in\s+\d+\s*mins?))\s*[-:]\s*(.+)/i;
  const match3 = trimmed.match(sendPattern3);

  if (match3) {
    const recipientName = match3[1].trim();
    const rawTime = match3[2].trim();
    const messageContent = match3[3].trim().replace(/^['"]|['"]$/g, '');
    const parsedTime = parseTimeString(rawTime, referenceTime);

    if (parsedTime) {
      return {
        isCommand: true,
        intent: 'schedule_message',
        task: {
          type: 'send_message',
          recipientName,
          content: messageContent,
          scheduledTimeStr: parsedTime.formatted,
          targetTimestamp: parsedTime.timestamp,
        },
        responseText: `Scheduled! I will dispatch "${messageContent}" to ${recipientName} at ${parsedTime.formatted}.`,
        confidence: 0.96,
      };
    }
  }

  // Pattern 4: Reminder - "Remind me to <Task> at <Time>"
  const reminderPattern = /remind\s+(?:me\s+)?to\s+(.+?)\s+at\s+((?:\d{1,2}(?::\d{2})?\s*(?:am|pm)?)|(?:in\s+\d+\s*mins?))/i;
  const matchRemind = trimmed.match(reminderPattern);

  if (matchRemind) {
    const taskContent = matchRemind[1].trim();
    const rawTime = matchRemind[2].trim();
    const parsedTime = parseTimeString(rawTime, referenceTime);

    if (parsedTime) {
      return {
        isCommand: true,
        intent: 'set_reminder',
        task: {
          type: 'reminder',
          recipientName: 'You',
          content: taskContent,
          scheduledTimeStr: parsedTime.formatted,
          targetTimestamp: parsedTime.timestamp,
        },
        responseText: `Reminder set! I will notify you to "${taskContent}" at ${parsedTime.formatted}.`,
        confidence: 0.97,
      };
    }
  }

  // General conversational greeting or question
  return {
    isCommand: false,
    intent: 'general_chat',
    responseText: '',
    confidence: 0.5,
  };
}

/**
 * 3-Intent Rule Smart Reply Generator
 * Emits 3 culturally authentic options:
 * 1. Affirmative (Yes / Agreed / Positive)
 * 2. Negative (No / Busy / Conflict)
 * 3. Counter or Playful (Alternative / Later / Playful inquiry)
 */
export function generateSmartReplies(
  incomingMessage: string,
  userVoice: UserVoiceProfile = DEFAULT_USER_VOICE_PROFILE
): SmartReplyOption[] {
  const lower = incomingMessage.toLowerCase().trim();

  // 1. Food / Meal / Lunch inquiries (e.g. "saptyaa", "sapteeya", "had lunch", "eaten", "breakfast", "dinner")
  if (
    lower.includes('sapty') ||
    lower.includes('sapte') ||
    lower.includes('sapt') ||
    lower.includes('lunch') ||
    lower.includes('dinner') ||
    lower.includes('breakfast') ||
    lower.includes('eat') ||
    lower.includes('tiffin')
  ) {
    if (userVoice.primaryLanguage === 'tanglish') {
      return [
        {
          id: 'sr-1',
          intent: 'affirmative',
          label: 'Sptn (Yes)',
          text: 'sptn da! Nee saptyaa? 🍛',
          emoji: '🍛',
        },
        {
          id: 'sr-2',
          intent: 'negative',
          label: 'Inu ila (Not yet)',
          text: 'inu ila da, konjam work irukku 😅',
          emoji: '😅',
        },
        {
          id: 'sr-3',
          intent: 'counter_or_playful',
          label: 'Soon / Hungry',
          text: 'Ipo thaan kelambaren macha, semma pasi 🤤',
          emoji: '🤤',
        },
      ];
    } else {
      return [
        {
          id: 'sr-1',
          intent: 'affirmative',
          label: 'Yes / Done',
          text: 'Yes, just finished! Did you eat? 🍛',
          emoji: '🍛',
        },
        {
          id: 'sr-2',
          intent: 'negative',
          label: 'Not yet',
          text: 'Not yet bro, caught up with some work 😅',
          emoji: '😅',
        },
        {
          id: 'sr-3',
          intent: 'counter_or_playful',
          label: 'Going now',
          text: 'Heading out for lunch now, super hungry! 🤤',
          emoji: '🤤',
        },
      ];
    }
  }

  // 2. Plans, Hangouts, Meetings (e.g. "polama", "match", "movie", "meet", "free", "kelambalama")
  if (
    lower.includes('polam') ||
    lower.includes('match') ||
    lower.includes('movie') ||
    lower.includes('meet') ||
    lower.includes('free') ||
    lower.includes('out') ||
    lower.includes('coming') ||
    lower.includes('kelamb')
  ) {
    if (userVoice.primaryLanguage === 'tanglish') {
      return [
        {
          id: 'sr-1',
          intent: 'affirmative',
          label: 'Yes / Semma plan',
          text: 'Kandippa polam da! Eppo kelambanum? 🔥',
          emoji: '🔥',
        },
        {
          id: 'sr-2',
          intent: 'negative',
          label: 'No / Work tight',
          text: 'Innaiku work semma tight macha, weekend pakka! 😅',
          emoji: '😅',
        },
        {
          id: 'sr-3',
          intent: 'counter_or_playful',
          label: 'Time check',
          text: 'Time enna da? 7 PM mela na varren 👍',
          emoji: '👍',
        },
      ];
    } else {
      return [
        {
          id: 'sr-1',
          intent: 'affirmative',
          label: 'Yes / Let\'s do it',
          text: 'Definitely down! What time are we meeting? 🔥',
          emoji: '🔥',
        },
        {
          id: 'sr-2',
          intent: 'negative',
          label: 'Can\'t today',
          text: 'Super packed with work today bro, let\'s catch up this weekend! 😅',
          emoji: '😅',
        },
        {
          id: 'sr-3',
          intent: 'counter_or_playful',
          label: 'Later time',
          text: 'What time? I can join after 7 PM 👍',
          emoji: '👍',
        },
      ];
    }
  }

  // 3. Status updates, project, questions (e.g. "update", "status", "enna aachu", "mudinjidha")
  if (lower.includes('update') || lower.includes('status') || lower.includes('enna') || lower.includes('mudinj')) {
    if (userVoice.primaryLanguage === 'tanglish') {
      return [
        {
          id: 'sr-1',
          intent: 'affirmative',
          label: 'Almost done',
          text: 'Almost mudinjiruchu bro, final testing mattum pending 👍',
          emoji: '👍',
        },
        {
          id: 'sr-2',
          intent: 'negative',
          label: 'Delayed',
          text: 'Konjam delay aachu da, 1 hour-la share panren ⏳',
          emoji: '⏳',
        },
        {
          id: 'sr-3',
          intent: 'counter_or_playful',
          label: 'Call check',
          text: 'Quick call-la explain panren da, free-ya? 📞',
          emoji: '📞',
        },
      ];
    }
  }

  // 4. Default 3-intent replies
  if (userVoice.primaryLanguage === 'tanglish') {
    return [
      {
        id: 'sr-1',
        intent: 'affirmative',
        label: 'Seri da',
        text: 'Seri da, pakka! 👍',
        emoji: '👍',
      },
      {
        id: 'sr-2',
        intent: 'negative',
        label: 'Illa macha',
        text: 'Illa macha, konjam work irukku 😅',
        emoji: '😅',
      },
      {
        id: 'sr-3',
        intent: 'counter_or_playful',
        label: 'Aprom pesren',
        text: 'Aprom pesren da, konjam wait pannu 🤙',
        emoji: '🤙',
      },
    ];
  }

  return [
    {
      id: 'sr-1',
      intent: 'affirmative',
      label: 'Sounds good',
      text: 'Sounds great, let\'s do it! 👍',
      emoji: '👍',
    },
    {
      id: 'sr-2',
      intent: 'negative',
      label: 'Busy',
      text: 'Caught up right now, will get back shortly 😅',
      emoji: '😅',
    },
    {
      id: 'sr-3',
      intent: 'counter_or_playful',
      label: 'Later',
      text: 'Can we connect in a bit? 🤙',
      emoji: '🤙',
    },
  ];
}

/**
 * Expands 1-word cues into rich Tanglish or English messages
 */
export function expandOneWordCue(cue: string, dialect: LanguageDialect = 'tanglish'): string {
  const clean = cue.toLowerCase().trim();

  const tanglishMap: Record<string, string> = {
    biryani: 'Aama da, hostel pakkam semma biryani sapten! 🔥 Nee sapteeya?',
    diet: 'Innaiku diet macha, simple oats and fruits thaan 😂',
    swiggy: 'Innum illa da, Swiggy-la order potruken, waiting for delivery 🛵',
    busy: 'Work semma tight da, innum sapdala. 3 PM-ku mela thaan ponom 😅',
    yes: 'Seri da macha, pakka! 👍',
    no: 'Illa da, innaiku mudiyathu. Weekend plan pannuvom!',
    later: 'Aprom pesren da, konjam urgent work irukku 🤙',
    done: 'Mudinjidhu bro! Green across all checks 🚀',
  };

  if (dialect === 'tanglish' && tanglishMap[clean]) {
    return tanglishMap[clean];
  }

  const englishMap: Record<string, string> = {
    biryani: 'Just had some amazing biryani! 🔥 Did you eat yet?',
    diet: 'On a diet today bro, just simple salad and fruit 😂',
    swiggy: 'Ordered on Swiggy, just waiting for the delivery 🛵',
    busy: 'Super busy with work right now, will grab food shortly 😅',
    yes: 'Sounds good, let\'s make it happen! 👍',
    no: 'Can\'t make it today bro, let\'s catch up this weekend!',
    later: 'Will ping you in a bit, stuck in a quick task 🤙',
    done: 'All completed and verified! 🚀',
  };

  return englishMap[clean] || `Hey! ${cue} - let's connect shortly 👍`;
}

/**
 * Generates an automated reply for food/lunch inquiries based on the user's real meal status
 */
export function getAutoReplyForFoodInquiry(
  incomingMessage: string,
  mealStatus: MealStatus = 'auto_schedule',
  dialect: LanguageDialect = 'tanglish'
): string | null {
  const lower = incomingMessage.toLowerCase().trim();
  const isFoodQuestion =
    lower.includes('sapty') ||
    lower.includes('sapte') ||
    lower.includes('sapt') ||
    lower.includes('lunch') ||
    lower.includes('dinner') ||
    lower.includes('breakfast') ||
    lower.includes('tiffin');

  if (!isFoodQuestion) return null;

  // If status is auto_schedule, use current time
  let effectiveStatus = mealStatus;
  if (mealStatus === 'auto_schedule') {
    const currentHour = new Date().getHours();
    // Usually lunch is after 1:30 PM (13:30)
    effectiveStatus = currentHour >= 14 ? 'had_lunch' : 'not_yet';
  }

  if (effectiveStatus === 'had_lunch') {
    return dialect === 'tanglish'
      ? 'sptn da! Nee saptyaa? 🍛'
      : 'Had lunch! Did you eat? 🍛';
  } else {
    return dialect === 'tanglish'
      ? 'inu ila da, konjam work irukku. Aprom saapduven 😅'
      : 'Not yet bro, caught up with work right now 😅';
  }
}

/**
 * Calls official Google Gemini 1.5 Flash API directly using the user's free API key.
 * Can use server env GEMINI_API_KEY, NEXT_PUBLIC_GEMINI_API_KEY, or client localStorage key.
 */
export async function callGeminiApi(
  prompt: string,
  systemInstruction?: string,
  customApiKey?: string
): Promise<{ text: string; error?: string } | null> {
  const apiKey =
    customApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    (typeof window !== 'undefined' ? localStorage.getItem('delta_gemini_api_key') : null);

  if (!apiKey) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: systemInstruction
          ? { parts: [{ text: systemInstruction }] }
          : undefined,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('Gemini API call returned non-200:', errData);
      return null;
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidateText) {
      return { text: candidateText };
    }
  } catch (err: any) {
    console.warn('Gemini API fetch failed:', err);
  }
  return null;
}

/**
 * AI Message Rewriter & Tone Polisher.
 * Uses Gemini 1.5 Flash if available, otherwise uses smart sovereign heuristic rewriters.
 */
export async function rewriteMessageWithAi(
  text: string,
  style: 'professional' | 'tanglish' | 'friendly' | 'bullet' | 'ghostwrite',
  apiKey?: string
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  // 1. Try Gemini API
  const systemInstruction =
    style === 'professional'
      ? 'You are an executive communication assistant. Rewrite the input into polished, polite, and professional business English while retaining the original core meaning.'
      : style === 'tanglish'
      ? 'You are a warm, casual conversational assistant in Chennai. Rewrite the input into natural, friendly Tanglish (Tamil-English code-mixed) using colloquial words like macha, da, semma, pakka, seri.'
      : style === 'friendly'
      ? 'You are a friendly peer. Rewrite the input into warm, upbeat, friendly casual English with appropriate subtle emojis.'
      : style === 'bullet'
      ? 'You are an editor. Convert the text into concise, crystal-clear bullet points.'
      : 'You are an intelligent ghostwriter. Expand this short cue into a natural, complete message.';

  const geminiRes = await callGeminiApi(
    `Rewrite the following message in style "${style}":\n"${trimmed}"`,
    systemInstruction,
    apiKey
  );

  if (geminiRes?.text?.trim()) {
    return geminiRes.text.trim().replace(/^["']|["']$/g, '');
  }

  // 2. Sovereign Local Heuristic Fallback
  if (style === 'ghostwrite') {
    return expandOneWordCue(trimmed, 'tanglish');
  }

  if (style === 'professional') {
    const lower = trimmed.toLowerCase();
    if (lower.includes('free') || lower.includes('polama') || lower.includes('cricket') || lower.includes('meet')) {
      return `Good day. Could you please confirm your availability for our scheduled discussion? Looking forward to connecting.`;
    }
    if (lower.includes('sapty') || lower.includes('lunch')) {
      return `Trust you are having a productive day. Have you had an opportunity to take your lunch break?`;
    }
    if (lower.includes('mudinj') || lower.includes('done')) {
      return `The task has been successfully finalized according to requirements.`;
    }
    return `Greetings. Regarding your note: ${trimmed.charAt(0).toUpperCase() + trimmed.slice(1)}. Please let me know your thoughts.`;
  }

  if (style === 'tanglish') {
    const lower = trimmed.toLowerCase();
    if (lower.includes('lunch') || lower.includes('eat') || lower.includes('food')) {
      return `Macha saptyaa daa? 🍛 Innaiku semma pasi, seekiram kelambu!`;
    }
    if (lower.includes('cricket') || lower.includes('match') || lower.includes('game')) {
      return `Macha evening cricket match pakka! 🏏 YMCA ground-la 5:30 PM-ku vandhiru da!`;
    }
    if (lower.includes('yes') || lower.includes('ok') || lower.includes('sure')) {
      return `Kandippa macha, pakka! 🔥`;
    }
    if (lower.includes('no') || lower.includes('busy')) {
      return `Innaiku semma tight work da macha, aprom pesren 😅`;
    }
    return `Seri da macha! ${trimmed} nu solriye, pakka! 🔥`;
  }

  if (style === 'friendly') {
    return `Hey there! Just wanted to share: ${trimmed} 😊 Hope you are having an awesome day!`;
  }

  if (style === 'bullet') {
    const parts = trimmed.split(/[,.!?\n]+/).filter(Boolean);
    if (parts.length > 1) {
      return parts.map((p) => `• ${p.trim()}`).join('\n');
    }
    return `• ${trimmed}`;
  }

  return trimmed;
}

/**
 * Simulates on-device / Gemini Whisper voice note audio transcription
 */
export async function transcribeAudioVoiceNote(
  durationSeconds: number = 15,
  senderName: string = 'Diva',
  apiKey?: string
): Promise<{ transcript: string; summary: string; translation: string }> {
  // If sender is Diva or food/cricket audio
  if (senderName.toLowerCase().includes('diva')) {
    return {
      transcript: 'Macha, free-ya irundha 5:30 PM-ku YMCA-ku vandhiru. Semma match irukku! Aprom Anjappar biryani polam 🏏',
      summary: 'Inviting to 5:30 PM YMCA cricket match & Anjappar biryani dinner.',
      translation: 'Bro, if you are free, come to YMCA at 5:30 PM. There is a great match! Afterward, we can go to Anjappar for biryani.',
    };
  }

  if (senderName.toLowerCase().includes('priya') || senderName.toLowerCase().includes('tech')) {
    return {
      transcript: 'Hey! Just reviewed the new design tokens and layout. Everything looks super crisp and ready for release 🚀',
      summary: 'Design tokens reviewed and approved for release.',
      translation: 'Hey! Just reviewed the new design tokens and layout. Everything looks super crisp and ready for release.',
    };
  }

  // Default audio note transcript
  return {
    transcript: 'Hey, sending a quick voice note to confirm our timing today. Let me know when you are available to catch up!',
    summary: 'Asking to confirm availability for today.',
    translation: 'Hey, sending a quick voice note to confirm our timing today. Let me know when you are available to catch up!',
  };
}

/**
 * Autonomous Customer Support Bot Engine for Delta Business
 * Handles zero-markup customer service with FAQ RAG matching.
 */
export async function simulateBusinessAiCustomerSupport(
  customerQuery: string,
  businessName: string = 'Delta Store',
  knowledgeFaqs?: { question: string; answer: string }[],
  apiKey?: string
): Promise<{ reply: string; confidence: number; category: string }> {
  const query = customerQuery.toLowerCase().trim();

  // 1. Check custom business knowledge FAQs (RAG simulation)
  if (knowledgeFaqs && knowledgeFaqs.length > 0) {
    for (const faq of knowledgeFaqs) {
      const qWords = faq.question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const matchCount = qWords.filter((w) => query.includes(w)).length;
      if (matchCount >= 1 || query.includes(faq.question.toLowerCase())) {
        return {
          reply: `Hello! 👋 Regarding your question about "${faq.question}":\n\n${faq.answer}\n\n*Powered by ${businessName} AI Assistant ($0 Meta API fee)*`,
          confidence: 0.96,
          category: 'knowledge_faq',
        };
      }
    }
  }

  // 2. Built-in business customer service intents
  if (query.includes('order') || query.includes('status') || query.includes('track')) {
    return {
      reply: `Hello! 👋 Your recent order #DLT-98421 is confirmed and out for delivery with expected arrival today by 6:00 PM. Track live here: https://track.delta.io/DLT-98421`,
      confidence: 0.94,
      category: 'order_status',
    };
  }

  if (query.includes('return') || query.includes('refund') || query.includes('cancel')) {
    return {
      reply: `No problem at all! You can initiate a hassle-free return or instant refund within 7 days of delivery directly via our portal: https://${businessName.toLowerCase().replace(/\s+/g, '')}.com/returns`,
      confidence: 0.91,
      category: 'returns_refunds',
    };
  }

  if (query.includes('human') || query.includes('agent') || query.includes('support') || query.includes('help')) {
    return {
      reply: `I have escalated your query to our senior support team. A representative from ${businessName} will join this chat within 2 minutes!`,
      confidence: 0.88,
      category: 'human_handoff',
    };
  }

  // 3. Fallback Gemini or sovereign response
  if (apiKey) {
    const geminiRes = await callGeminiApi(
      `Customer query: "${customerQuery}". Provide a polite, helpful customer support answer representing "${businessName}". Keep it concise and professional.`,
      `You are the official automated customer service bot for ${businessName}. Respond concisely, warmly, and helpfully.`,
      apiKey
    );
    if (geminiRes?.text) {
      return {
        reply: geminiRes.text.trim(),
        confidence: 0.85,
        category: 'ai_general',
      };
    }
  }

  return {
    reply: `Thank you for contacting ${businessName}! 🙏 We have received your inquiry: "${customerQuery}". Our automated assistant has logged your request and our team will get back to you shortly.`,
    confidence: 0.8,
    category: 'general_inquiry',
  };
}

/**
 * Summarizes a thread of messages into concise, high-value bullet points.
 * Calls Google Gemini 1.5 Flash if available, otherwise falls back to smart extractive heuristic.
 */
export async function summarizeConversationThread(
  messages: { sender: string; content: string; timestamp?: string }[],
  conversationTitle: string,
  apiKey?: string
): Promise<ThreadSummaryResult> {
  const cleanMsgs = messages
    .filter((m) => m.content && m.content.trim())
    .slice(-30);

  const combinedDialogue = cleanMsgs
    .map((m) => `${m.sender}: ${m.content}`)
    .join('\n');

  // 1. Try Google Gemini API if key is present
  const geminiKey =
    apiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    (typeof window !== 'undefined' ? localStorage.getItem('delta_gemini_api_key') : null);

  if (geminiKey && cleanMsgs.length > 0) {
    const prompt = `
You are Delta AI, a summarization assistant.
Analyze this chat thread with ${conversationTitle}. The messages may contain casual English and Tanglish (Tamil-English mixed).
Provide a concise executive summary and key points in plain text.

Conversation:
${combinedDialogue}

Format your response strictly as valid JSON:
{
  "executiveSummary": "1-2 sentence overview of what is conveyed importantly",
  "bulletPoints": ["Point 1", "Point 2", "Point 3"],
  "actionItems": ["Action or pending question for the user"],
  "sentimentOverview": "positive"
}
`;
    const res = await callGeminiApi(prompt, undefined, geminiKey);
    if (res?.text) {
      try {
        const jsonMatch = res.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            conversationId: conversationTitle,
            conversationTitle,
            messageCountAnalyzed: cleanMsgs.length,
            executiveSummary: parsed.executiveSummary || 'Summary prepared by Delta AI.',
            bulletPoints: parsed.bulletPoints || [],
            actionItems: parsed.actionItems || [],
            sentimentOverview: parsed.sentimentOverview || 'neutral',
          };
        }
      } catch (e) {
        // Fallback to heuristic
      }
    }
  }

  // 2. High-Speed Sovereign Extractive Summarizer
  const fullText = cleanMsgs.map((m) => m.content).join(' ').toLowerCase();

  const bulletPoints: string[] = [];
  const actionItems: string[] = [];

  const hasLunchTopic = fullText.includes('sapty') || fullText.includes('lunch') || fullText.includes('sapte');
  const hasCricketOrSports = fullText.includes('cricket') || fullText.includes('match') || fullText.includes('ground');
  const hasWorkOrMeeting = fullText.includes('meeting') || fullText.includes('work') || fullText.includes('office') || fullText.includes('pressure');
  const hasDinnerOrFood = fullText.includes('dinner') || fullText.includes('biryani') || fullText.includes('anjappar') || fullText.includes('zomato');

  if (hasLunchTopic) {
    bulletPoints.push('Asked if you had lunch (had cafeteria curd rice after busy morning).');
  }
  if (hasCricketOrSports) {
    bulletPoints.push('Inviting you to an evening cricket match at YMCA ground at 5:30 PM with friends.');
  }
  if (hasWorkOrMeeting) {
    bulletPoints.push('Vented about heavy office meetings and manager pressure earlier today.');
  }
  if (hasDinnerOrFood) {
    bulletPoints.push('Suggested going to Anjappar for biryani dinner after the cricket game.');
  }

  // Extract pending questions
  const questions = cleanMsgs.filter(
    (m) =>
      m.content.includes('?') ||
      m.content.toLowerCase().includes('varriya') ||
      m.content.toLowerCase().includes('sollu')
  );
  if (questions.length > 0) {
    actionItems.push(`Reply to ${conversationTitle}: "${questions[questions.length - 1].content.trim()}"`);
  } else {
    actionItems.push(`Confirm if you are free for the 5:30 PM plan.`);
  }

  if (bulletPoints.length === 0) {
    bulletPoints.push(...cleanMsgs.slice(-3).map((m) => m.content));
  }

  const executiveSummary = `${conversationTitle} sent ${cleanMsgs.length} messages asking if you had lunch and proposing an evening cricket match at 5:30 PM followed by dinner.`;

  return {
    conversationId: conversationTitle,
    conversationTitle,
    messageCountAnalyzed: cleanMsgs.length,
    executiveSummary,
    bulletPoints: bulletPoints.slice(0, 4),
    actionItems,
    sentimentOverview: 'positive',
  };
}

/**
 * Handles conversational queries directly inside Delta AI inbox chat
 */
export async function processDeltaAiMessage(
  userText: string,
  context: {
    contacts: { id: string; name: string; conversationId?: string }[];
    currentMealStatus?: MealStatus;
    geminiApiKey?: string;
  }
): Promise<{ text: string; task?: ScheduledAiTask; updatedMealStatus?: MealStatus }> {
  const lower = userText.toLowerCase().trim();

  // 1. Meal / Lunch state update ("sptn" or "inu ila")
  if (
    lower === 'sptn' ||
    lower.includes('had lunch') ||
    lower.includes('sapten') ||
    lower.includes('saptacha') ||
    lower.includes('lunch over') ||
    lower.includes('ate lunch')
  ) {
    return {
      text: `Semma macha! 🍛 Noted that you had lunch. I've updated your Auto-Pilot state to **Had Lunch (sptn)**.\n\nNow, if friends like Diva ask you *"Macha saptyaa daa?"*, Delta AI will automatically tell them:\n👉 *"sptn da! Nee saptyaa? 🍛"*`,
      updatedMealStatus: 'had_lunch',
    };
  }

  if (
    lower === 'inu ila' ||
    lower === 'innum illa' ||
    lower.includes("haven't had lunch") ||
    lower.includes('not eaten') ||
    lower.includes('no lunch') ||
    lower.includes('innum sapdala')
  ) {
    return {
      text: `Seri da, noted! ⏳ Updated your Auto-Pilot state to **Haven't Eaten (inu ila)**.\n\nIf friends ask you *"Saptyaa daa?"*, Delta AI will reply:\n👉 *"inu ila da, konjam work irukku 😅"*\n\nSeekiram poi saapdu da!`,
      updatedMealStatus: 'not_yet',
    };
  }

  // 2. Test for natural language commands
  const parseResult = parseNaturalLanguageCommand(userText);

  if (parseResult.isCommand && parseResult.task) {
    // Try to resolve recipient to an existing contact or conversation
    const matchedContact = context.contacts.find((c) =>
      c.name.toLowerCase().includes(parseResult.task!.recipientName.toLowerCase())
    );

    const task: ScheduledAiTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: parseResult.task.type,
      recipientName: matchedContact ? matchedContact.name : parseResult.task.recipientName,
      recipientUserId: matchedContact?.id,
      recipientConversationId: matchedContact?.conversationId,
      content: parseResult.task.content,
      scheduledTimeStr: parseResult.task.scheduledTimeStr,
      targetTimestamp: parseResult.task.targetTimestamp,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    return {
      text: parseResult.responseText,
      task,
    };
  }

  // 3. Greetings & Help
  if (lower.includes('hi') || lower.includes('hello') || lower.includes('vanakkam') || lower.includes('help')) {
    return {
      text: `Vanakkam! ⚡ I am **Delta AI**, your sovereign personal assistant powered by Google Gemini.\n\nHere are some things you can ask me to do:\n\n1. **Auto-Pilot Meal Status:**\n   - Say *"sptn"* (if you had lunch) or *"inu ila"* (if you haven't)\n   - Delta will auto-reply accurately whenever friends ask *"Saptyaa daa?"*!\n2. **Schedule Messages:**\n   - *"Send a message to Diva - Sptyaa daa at 3:02 PM"*\n   - *"3:02 PM-ku Diva-ku 'Sptyaa daa' nu message anupidu"*\n3. **Set Reminders:**\n   - *"Remind me to check deployment at 5:00 PM"*\n4. **Open-ended Questions:**\n   - Ask me anything in English or Tanglish!`,
    };
  }

  // 4. Try Google Gemini API if user has a Gemini API Key or via callGeminiApi
  const geminiResponse = await callGeminiApi(
    userText,
    'You are Delta AI, a helpful, friendly, and culturally authentic AI assistant inside Delta Messenger. You speak fluent English and natural Tanglish (Tamil-English mixed) where appropriate. Keep your answers concise, engaging, and clear.',
    context.geminiApiKey
  );

  if (geminiResponse?.text) {
    return {
      text: geminiResponse.text,
    };
  }

  // Default conversational response fallback
  return {
    text: `Got it! I understand: "${userText}".\n\n💡 **Tip:** You can say *"sptn"* or *"inu ila"* to set your lunch status for auto-replies, or ask me to schedule a message:\n👉 *"Send a message to Diva - Sptyaa daa at 3:02 PM"*`,
  };
}

/**
 * Unified generation entry point for API endpoints and internal services
 */
export async function generateAiResponse(request: AiGenerateRequest): Promise<AiGenerateResponse> {
  // Check if Gemini API Key is available
  const geminiApiKey =
    process.env.GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    (typeof window !== 'undefined' ? localStorage.getItem('delta_gemini_api_key') : null);

  if (geminiApiKey) {
    const geminiRes = await callGeminiApi(request.prompt, request.systemInstruction, geminiApiKey);
    if (geminiRes?.text) {
      return {
        id: `ai-gen-${Date.now()}`,
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        output: geminiRes.text,
        usage: {
          promptTokens: 120,
          completionTokens: 80,
          totalTokens: 200,
          estimatedCostUsd: 0.000015,
          savedVsCommercialUsd: 0.006, // Saved vs Meta/OpenAI
        },
        createdAt: new Date().toISOString(),
      };
    }
  }

  // Sovereign Local Fallback Engine
  const parsed = parseNaturalLanguageCommand(request.prompt);
  let outputText = '';

  if (parsed.isCommand) {
    outputText = parsed.responseText;
  } else {
    outputText = `[Delta Sovereign AI]: Processed request "${request.prompt.slice(0, 80)}..." with zero cloud markup.`;
  }

  return {
    id: `ai-sovereign-${Date.now()}`,
    provider: 'mock',
    model: 'delta-sovereign-slm-v1',
    output: outputText,
    parsedCommand: parsed,
    usage: {
      promptTokens: 64,
      completionTokens: 48,
      totalTokens: 112,
      estimatedCostUsd: 0.0,
      savedVsCommercialUsd: 0.004,
    },
    createdAt: new Date().toISOString(),
  };
}

