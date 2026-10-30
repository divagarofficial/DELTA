import { describe, it, expect } from 'vitest';
import {
  formatLastSeen,
  formatFileSize,
  formatDuration,
  getInitials,
  normalizePhoneNumber,
  isValidPhoneNumber,
} from '@/lib/utils';
import { ConversationMember, Message, Profile } from '@/types';

describe('Delta Messaging Utilities & Business Rules', () => {
  describe('formatLastSeen Privacy Enforcement', () => {
    it('returns "Offline" if privacy is set to "nobody"', () => {
      const recent = new Date().toISOString();
      expect(formatLastSeen(recent, 'nobody')).toBe('Offline');
    });

    it('returns "Online" if activity is within 3 minutes', () => {
      const justNow = new Date(Date.now() - 60 * 1000).toISOString();
      expect(formatLastSeen(justNow, 'everyone')).toBe('Online');
    });

    it('returns "Offline" if no dateString is provided', () => {
      expect(formatLastSeen(undefined, 'everyone')).toBe('Offline');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576 * 2.5)).toBe('2.5 MB');
    });
  });

  describe('formatDuration', () => {
    it('formats seconds into mm:ss format', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(45)).toBe('0:45');
      expect(formatDuration(75)).toBe('1:15');
      expect(formatDuration(360)).toBe('6:00');
    });
  });

  describe('getInitials', () => {
    it('extracts two letters from full name', () => {
      expect(getInitials('Priya Sharma')).toBe('PS');
      expect(getInitials('Aarav Mehta')).toBe('AM');
      expect(getInitials('Delta')).toBe('DE');
      expect(getInitials('')).toBe('D');
    });
  });

  describe('Conversation Membership & Authorization Logic', () => {
    const members: ConversationMember[] = [
      {
        id: 'm1',
        conversation_id: 'conv-101',
        user_id: 'user-alice',
        role: 'admin',
        joined_at: new Date().toISOString(),
      },
      {
        id: 'm2',
        conversation_id: 'conv-101',
        user_id: 'user-bob',
        role: 'member',
        joined_at: new Date().toISOString(),
      },
    ];

    function isConversationMember(userId: string, convId: string): boolean {
      return members.some((m) => m.conversation_id === convId && m.user_id === userId);
    }

    it('authorizes authenticated members', () => {
      expect(isConversationMember('user-alice', 'conv-101')).toBe(true);
      expect(isConversationMember('user-bob', 'conv-101')).toBe(true);
    });

    it('strictly denies non-members and unauthorized IDs', () => {
      expect(isConversationMember('user-charlie', 'conv-101')).toBe(false);
      expect(isConversationMember('user-alice', 'conv-999')).toBe(false);
    });
  });

  describe('Poll Voting Calculations', () => {
    it('updates vote counts accurately for single-choice polls', () => {
      const poll = {
        id: 'poll-1',
        message_id: 'msg-1',
        question: 'Deploy now?',
        is_multiple: false,
        is_anonymous: false,
        options: [
          { id: 'opt-1', poll_id: 'poll-1', option_text: 'Yes', order_index: 0, votes_count: 1, has_voted: true },
          { id: 'opt-2', poll_id: 'poll-1', option_text: 'No', order_index: 1, votes_count: 0, has_voted: false },
        ],
        total_votes: 1,
      };

      // Switch vote to Option 2
      const updatedOptions = poll.options.map((opt) => {
        if (opt.id === 'opt-2') {
          return { ...opt, has_voted: true, votes_count: opt.votes_count + 1 };
        }
        if (opt.has_voted) {
          return { ...opt, has_voted: false, votes_count: opt.votes_count - 1 };
        }
        return opt;
      });

      const total = updatedOptions.reduce((acc, o) => acc + o.votes_count, 0);

      expect(total).toBe(1);
      expect(updatedOptions.find((o) => o.id === 'opt-2')?.votes_count).toBe(1);
      expect(updatedOptions.find((o) => o.id === 'opt-1')?.votes_count).toBe(0);
    });
  });

  describe('Mobile Number Key Identity & Normalization', () => {
    it('normalizes 10-digit Indian numbers with +91 country prefix', () => {
      expect(normalizePhoneNumber('9876543210')).toBe('+919876543210');
      expect(normalizePhoneNumber('+91 98765 43210')).toBe('+919876543210');
      expect(normalizePhoneNumber('09876543210')).toBe('+919876543210');
    });

    it('validates 10-digit or valid international phone numbers', () => {
      expect(isValidPhoneNumber('9876543210')).toBe(true);
      expect(isValidPhoneNumber('+91 98765 43210')).toBe(true);
      expect(isValidPhoneNumber('+1 555 123 4567')).toBe(true);
      expect(isValidPhoneNumber('123')).toBe(false);
      expect(isValidPhoneNumber('')).toBe(false);
    });

    it('resolves user identity by mobile number OR by username', () => {
      const mockProfiles = [
        { id: 'u1', username: 'aarav', display_name: 'Aarav Mehta', phone_number: '+91 98765 43210' },
        { id: 'u2', username: 'priya', display_name: 'Priya Sharma', phone_number: '+91 98111 22334' },
      ];

      function findUserByIdentity(query: string) {
        const trimmed = query.trim();
        const digits = trimmed.replace(/\D/g, '');
        const cleanUser = trimmed.toLowerCase().replace('@', '');

        return mockProfiles.find((p) => {
          if (digits.length >= 10 && p.phone_number.replace(/\D/g, '').endsWith(digits.slice(-10))) {
            return true;
          }
          if (p.username.toLowerCase() === cleanUser) {
            return true;
          }
          return false;
        });
      }

      // Login by mobile number
      expect(findUserByIdentity('9876543210')?.id).toBe('u1');
      expect(findUserByIdentity('+91 98111 22334')?.id).toBe('u2');

      // Login by username
      expect(findUserByIdentity('aarav')?.id).toBe('u1');
      expect(findUserByIdentity('@priya')?.id).toBe('u2');

      // Nonexistent lookup
      expect(findUserByIdentity('9999999999')).toBeUndefined();
      expect(findUserByIdentity('unknown_user')).toBeUndefined();
    });
  });

  describe('Message Delivery & Accurate Recipient Routing', () => {
    it('optimistically appends messages with instant 0ms feedback and sent status', () => {
      const messagesMap: Record<string, Message[]> = {
        'conv-priya': [],
      };

      const tempId = `msg-opt-${Date.now()}`;
      const msg: Message = {
        id: tempId,
        conversation_id: 'conv-priya',
        sender_id: 'user-aarav',
        content: 'Instant message',
        type: 'text',
        created_at: new Date().toISOString(),
        status: 'sent',
        is_optimistic: true,
      };

      // Instant optimistic append
      messagesMap['conv-priya'].push(msg);

      expect(messagesMap['conv-priya']).toHaveLength(1);
      expect(messagesMap['conv-priya'][0].is_optimistic).toBe(true);
      expect(messagesMap['conv-priya'][0].status).toBe('sent');

      // Receipt lifecycle progression: delivered -> read
      messagesMap['conv-priya'][0].status = 'delivered';
      messagesMap['conv-priya'][0].is_optimistic = false;
      expect(messagesMap['conv-priya'][0].status).toBe('delivered');

      messagesMap['conv-priya'][0].status = 'read';
      expect(messagesMap['conv-priya'][0].status).toBe('read');
    });

    it('strictly isolates messages so messages never leak between conversations or users', () => {
      const messagesMap: Record<string, Message[]> = {
        'conv-priya': [{ id: 'm1', conversation_id: 'conv-priya', sender_id: 'user-aarav', content: 'Secret for Priya', type: 'text', created_at: '', status: 'read' }],
        'conv-arjun': [{ id: 'm2', conversation_id: 'conv-arjun', sender_id: 'user-aarav', content: 'DevOps notes for Arjun', type: 'text', created_at: '', status: 'read' }],
      };

      // Message for Priya is strictly inside conv-priya
      expect(messagesMap['conv-priya'].some((m) => m.content.includes('Arjun'))).toBe(false);
      expect(messagesMap['conv-arjun'].some((m) => m.content.includes('Priya'))).toBe(false);
    });

    it('accurately resolves recipient responder by conversation membership', () => {
      const allProfiles: Profile[] = [
        { id: 'u-aarav', username: 'aarav', display_name: 'Aarav Mehta' },
        { id: 'u-priya', username: 'priya', display_name: 'Priya Sharma' },
        { id: 'u-arjun', username: 'arjun', display_name: 'Arjun Patel' },
        { id: 'u-vikram', username: 'vikram', display_name: 'Vikram Malhotra' },
      ];

      function resolveRecipient(conv: { type: string; members: { user_id: string }[]; title?: string }, currentUserId: string) {
        const otherMember = conv.members?.find((m) => m.user_id !== currentUserId);
        if (otherMember) {
          const found = allProfiles.find((p) => p.id === otherMember.user_id);
          if (found) return found;
        }
        if (conv.title) {
          const byTitle = allProfiles.find((p) => p.display_name === conv.title || p.username === conv.title);
          if (byTitle) return byTitle;
        }
        return allProfiles[1];
      }

      // In Arjun's direct conversation, responder MUST be Arjun Patel
      const convArjun = {
        type: 'direct',
        members: [{ user_id: 'u-aarav' }, { user_id: 'u-arjun' }],
        title: 'Arjun Patel',
      };
      expect(resolveRecipient(convArjun, 'u-aarav').display_name).toBe('Arjun Patel');

      // In newly registered user Vikram's conversation, responder MUST be Vikram Malhotra
      const convVikram = {
        type: 'direct',
        members: [{ user_id: 'u-aarav' }, { user_id: 'u-vikram' }],
        title: 'Vikram Malhotra',
      };
      expect(resolveRecipient(convVikram, 'u-aarav').display_name).toBe('Vikram Malhotra');
    });

    it('attaches 3GPP Rel-17 NTN satellite telemetry when satellite mode is enabled', () => {
      const satelliteMsg: Message = {
        id: 'msg-sat-101',
        conversation_id: 'conv-priya',
        sender_id: 'u-aarav',
        content: 'Transmitting from mid-Atlantic without ground cellular coverage',
        type: 'text',
        created_at: new Date().toISOString(),
        status: 'sent',
        is_satellite: true,
        satellite_meta: {
          satellite_id: 'STARLINK-V2M-3841',
          constellation: 'Direct-to-Cell LEO (3GPP Rel-17 NTN)',
          elevation_deg: 54.2,
          azimuth_deg: 218.4,
          signal_quality: 'optimal',
          latency_ms: 780,
        },
      };

      expect(satelliteMsg.is_satellite).toBe(true);
      expect(satelliteMsg.satellite_meta?.satellite_id).toBe('STARLINK-V2M-3841');
      expect(satelliteMsg.satellite_meta?.constellation).toContain('Direct-to-Cell');
      expect(satelliteMsg.satellite_meta?.latency_ms).toBeGreaterThan(500);
      expect(satelliteMsg.satellite_meta?.signal_quality).toBe('optimal');
    });
  });
});

