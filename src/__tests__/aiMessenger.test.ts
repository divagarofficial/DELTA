import { describe, it, expect } from 'vitest';
import {
  parseTimeString,
  parseNaturalLanguageCommand,
  generateSmartReplies,
  expandOneWordCue,
  processDeltaAiMessage,
  getAutoReplyForFoodInquiry,
  summarizeConversationThread,
  rewriteMessageWithAi,
  transcribeAudioVoiceNote,
  simulateBusinessAiCustomerSupport,
  DEFAULT_USER_VOICE_PROFILE,
} from '@/lib/ai/deltaAiEngine';

describe('Delta AI Messenger Engine', () => {
  describe('Natural Language Command & Scheduler Parser', () => {
    it('parses English scheduling commands: "Send a message to Diva - Sptyaa daa at 3:02 PM"', () => {
      const command = 'Send a message to Diva - Sptyaa daa at 3:02 PM';
      const result = parseNaturalLanguageCommand(command);

      expect(result.isCommand).toBe(true);
      expect(result.intent).toBe('schedule_message');
      expect(result.task?.recipientName).toBe('Diva');
      expect(result.task?.content).toBe('Sptyaa daa');
      expect(result.task?.scheduledTimeStr).toBe('3:02 PM');
      expect(result.task?.targetTimestamp).toBeGreaterThan(0);
      expect(result.responseText).toContain('Diva');
    });

    it('parses Tanglish scheduling commands: "3:02 PM-ku Diva-ku \'Sptyaa daa\' nu message anupidu"', () => {
      const command = "3:02 PM-ku Diva-ku 'Sptyaa daa' nu message anupidu";
      const result = parseNaturalLanguageCommand(command);

      expect(result.isCommand).toBe(true);
      expect(result.intent).toBe('schedule_message');
      expect(result.task?.recipientName).toBe('Diva');
      expect(result.task?.content).toBe('Sptyaa daa');
      expect(result.task?.scheduledTimeStr).toBe('3:02 PM');
      expect(result.responseText).toContain('Pakka!');
    });

    it('parses user exact phrase: "Diva ku 2 PM ku sptyaa da nu msg pannu"', () => {
      const command = 'Diva ku 2 PM ku sptyaa da nu msg pannu';
      const result = parseNaturalLanguageCommand(command);

      expect(result.isCommand).toBe(true);
      expect(result.intent).toBe('schedule_message');
      expect(result.task?.recipientName).toBe('Diva');
      expect(result.task?.content).toBe('sptyaa da');
      expect(result.task?.scheduledTimeStr).toBe('2:00 PM');
      expect(result.responseText).toContain('Pakka!');
      expect(result.responseText).toContain('Diva');
    });

    it('parses reminder commands: "Remind me to check deployment at 5:00 PM"', () => {
      const command = 'Remind me to check deployment at 5:00 PM';
      const result = parseNaturalLanguageCommand(command);

      expect(result.isCommand).toBe(true);
      expect(result.intent).toBe('set_reminder');
      expect(result.task?.content).toBe('check deployment');
      expect(result.task?.scheduledTimeStr).toBe('5:00 PM');
    });

    it('correctly calculates future timestamps for time strings', () => {
      const parsed = parseTimeString('3:02 PM');
      expect(parsed).not.toBeNull();
      expect(parsed?.formatted).toBe('3:02 PM');
      expect(typeof parsed?.timestamp).toBe('number');
    });
  });

  describe('3-Intent Rule Smart Reply Generator', () => {
    it('generates 3 authentic Tanglish replies for food inquiries ("Macha saptyaa daa?")', () => {
      const incoming = 'Macha saptyaa daa?';
      const replies = generateSmartReplies(incoming, DEFAULT_USER_VOICE_PROFILE);

      expect(replies).toHaveLength(3);
      // Affirmative: Sptn
      expect(replies[0].intent).toBe('affirmative');
      expect(replies[0].text).toContain('sptn da');
      // Negative: Inu ila
      expect(replies[1].intent).toBe('negative');
      expect(replies[1].text).toContain('inu ila da');
      // Counter / Soon
      expect(replies[2].intent).toBe('counter_or_playful');
      expect(replies[2].text).toContain('pasi');
    });

    it('generates 3 authentic Tanglish replies for outing/hangout inquiries ("Evening cricket polama?")', () => {
      const incoming = 'Evening cricket polama?';
      const replies = generateSmartReplies(incoming, DEFAULT_USER_VOICE_PROFILE);

      expect(replies).toHaveLength(3);
      expect(replies[0].text).toContain('Kandippa polam');
      expect(replies[1].text).toContain('tight');
    });
  });

  describe('Auto-Reply Meal Status Resolver', () => {
    it('returns "sptn da" if user had lunch', () => {
      const reply = getAutoReplyForFoodInquiry('Macha saptyaa daa?', 'had_lunch', 'tanglish');
      expect(reply).toBe('sptn da! Nee saptyaa? 🍛');
    });

    it('returns "inu ila da" if user has not had lunch', () => {
      const reply = getAutoReplyForFoodInquiry('Macha saptyaa daa?', 'not_yet', 'tanglish');
      expect(reply).toBe('inu ila da, konjam work irukku. Aprom saapduven 😅');
    });
  });

  describe('AI Ghostwrite 1-Word Cue Expansion', () => {
    it('expands food cue "biryani" into full Tanglish reply', () => {
      const expanded = expandOneWordCue('biryani', 'tanglish');
      expect(expanded).toContain('biryani');
      expect(expanded).toContain('Aama da');
    });

    it('expands "diet" into natural Tanglish reply', () => {
      const expanded = expandOneWordCue('diet', 'tanglish');
      expect(expanded).toContain('diet');
    });

    it('expands "swiggy" into order tracking reply', () => {
      const expanded = expandOneWordCue('swiggy', 'tanglish');
      expect(expanded).toContain('Swiggy');
    });
  });

  describe('Delta AI Inbox Conversational Assistant & State Updates', () => {
    it('updates meal status to had_lunch when user messages "sptn"', async () => {
      const result = await processDeltaAiMessage('sptn', { contacts: [] });
      expect(result.updatedMealStatus).toBe('had_lunch');
      expect(result.text).toContain('Had Lunch (sptn)');
    });

    it('updates meal status to not_yet when user messages "inu ila"', async () => {
      const result = await processDeltaAiMessage('inu ila', { contacts: [] });
      expect(result.updatedMealStatus).toBe('not_yet');
      expect(result.text).toContain("Haven't Eaten (inu ila)");
    });

    it('resolves contacts and outputs task payload for scheduling commands', async () => {
      const contacts = [{ id: 'user-diva', name: 'Diva', conversationId: 'conv-diva' }];
      const result = await processDeltaAiMessage('Send a message to Diva - Sptyaa daa at 3:02 PM', { contacts });

      expect(result.task).toBeDefined();
      expect(result.task?.recipientName).toBe('Diva');
      expect(result.task?.recipientConversationId).toBe('conv-diva');
      expect(result.task?.content).toBe('Sptyaa daa');
      expect(result.text).toContain('Diva');
    });

    it('responds to greetings with helpful command examples in Tanglish & English', async () => {
      const result = await processDeltaAiMessage('Vanakkam', { contacts: [] });
      expect(result.text).toContain('Vanakkam');
      expect(result.text).toContain('Delta AI');
      expect(result.text).toContain('Sptyaa daa');
    });
  });

  describe('Thread Catch-Up Summarizer (15+ Messages)', () => {
    it('summarizes 16 Tanglish messages into what was importantly conveyed', async () => {
      const mockMessages = [
        { sender: 'Diva', content: 'Macha saptyaa daa?' },
        { sender: 'Diva', content: 'Innaiku morning office-la semma tension da 🤦‍♂️' },
        { sender: 'Diva', content: 'Production bug vandhuruchu, client meeting 10 AM-lendhu continuous.' },
        { sender: 'Diva', content: 'Ipo thaan cafeteria poi simple curd rice sapten 🍛' },
        { sender: 'Diva', content: 'Evening YMCA ground-la 5:30 PM ku cricket match irukku.' },
        { sender: 'Diva', content: 'Suresh, Vikram, Karthi ellarum varranga.' },
        { sender: 'Diva', content: 'Unakku free slot irukka?' },
        { sender: 'Diva', content: 'Nee compulsory varanum macha!' },
        { sender: 'Diva', content: 'Nee bat eduthutu vaa, ball naanga vaangittom.' },
        { sender: 'Diva', content: 'Light-ah rain vara maari irukku, aana pitch covers potrukanga.' },
        { sender: 'Diva', content: 'Match mudinjadhum Anjappar biryani polam nu plan!' },
        { sender: 'Diva', content: 'Semma mutton biryani and pepper chicken sapdalom 🤤' },
        { sender: 'Diva', content: 'Dei sollu da, varriya illaya? Spot confirm pannanum.' },
        { sender: 'Diva', content: 'Unakku opening slot vechirukken 🔥' },
        { sender: 'Diva', content: 'Online-la thaane irukka, reply pannu da 👀' },
        { sender: 'Diva', content: 'Free-ya irundha 5:30 PM-ku YMCA-ku vandhiru macha 🏏' },
      ];

      const summary = await summarizeConversationThread(mockMessages, 'Diva');

      expect(summary.messageCountAnalyzed).toBe(16);
      expect(summary.conversationTitle).toBe('Diva');
      expect(summary.executiveSummary).toContain('Diva sent 16 messages');
      expect(summary.executiveSummary).toContain('5:30 PM');
      expect(summary.bulletPoints.length).toBeGreaterThanOrEqual(3);
      expect(summary.bulletPoints.some((b) => b.toLowerCase().includes('lunch') || b.toLowerCase().includes('curd rice'))).toBe(true);
      expect(summary.bulletPoints.some((b) => b.toLowerCase().includes('cricket') || b.toLowerCase().includes('ymca'))).toBe(true);
      expect(summary.bulletPoints.some((b) => b.toLowerCase().includes('biryani') || b.toLowerCase().includes('anjappar'))).toBe(true);
      expect(summary.actionItems.length).toBeGreaterThan(0);
      expect(summary.actionItems[0]).toContain('Diva');
    });
  });

  describe('AI Message Tone Rewriter & Polisher', () => {
    it('rewrites draft into natural Tanglish casual slang', async () => {
      const rewritten = await rewriteMessageWithAi('Are you coming to play cricket?', 'tanglish');
      expect(rewritten.toLowerCase()).toContain('macha');
      expect(rewritten.toLowerCase()).toContain('cricket');
    });

    it('rewrites draft into formal corporate professional English', async () => {
      const rewritten = await rewriteMessageWithAi('free to meet?', 'professional');
      expect(rewritten).toContain('availability');
    });

    it('bulletizes messages for concise reading', async () => {
      const rewritten = await rewriteMessageWithAi('Buy cricket ball. Reach YMCA ground by 5 PM. Eat biryani after match.', 'bullet');
      expect(rewritten).toContain('•');
      expect(rewritten.split('•').length).toBeGreaterThan(2);
    });
  });

  describe('AI Whisper Audio Note Transcription', () => {
    it('transcribes voice note and extracts summary and translation for Diva', async () => {
      const audioResult = await transcribeAudioVoiceNote(15, 'Diva');
      expect(audioResult.transcript).toContain('YMCA');
      expect(audioResult.transcript).toContain('biryani');
      expect(audioResult.summary).toContain('cricket');
      expect(audioResult.translation).toContain('YMCA');
    });
  });

  describe('Delta Business AI Support Agent & FAQ RAG', () => {
    it('matches customer question against custom Knowledge Base FAQs', async () => {
      const faqs = [
        { question: 'What is your delivery timeframe?', answer: 'Orders placed before 2 PM are delivered same day.' },
        { question: 'How do returns work?', answer: '7-day no-questions-asked refund policy.' },
      ];

      const res = await simulateBusinessAiCustomerSupport('delivery timeframe', 'Delta Electronics', faqs);
      expect(res.category).toBe('knowledge_faq');
      expect(res.reply).toContain('Orders placed before 2 PM');
      expect(res.confidence).toBeGreaterThan(0.9);
    });

    it('handles automated order status tracking queries', async () => {
      const res = await simulateBusinessAiCustomerSupport('Where is my order track status?', 'Delta Retail');
      expect(res.category).toBe('order_status');
      expect(res.reply).toContain('DLT-98421');
    });
  });
});

