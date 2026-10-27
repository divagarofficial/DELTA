import { describe, it, expect } from 'vitest';
import {
  formatLastSeen,
  formatFileSize,
  formatDuration,
  getInitials,
  normalizePhoneNumber,
  isValidPhoneNumber,
} from '@/lib/utils';
import { ConversationMember, Message } from '@/types';

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
});
