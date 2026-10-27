import { describe, it, expect } from 'vitest';
import {
  isWebContactsSupported,
  parseVCard,
  parseCSVContacts,
  matchContactsWithProfiles,
  DEMO_PHONE_ADDRESS_BOOK,
  RawContactInput,
} from '@/lib/contacts/contactSync';
import { Profile } from '@/types';

describe('Phone Contact Synchronization & Matching Engine', () => {
  describe('isWebContactsSupported', () => {
    it('returns false in non-browser Node environments', () => {
      expect(isWebContactsSupported()).toBe(false);
    });
  });

  describe('parseVCard', () => {
    it('parses standard vCard format with FN and TEL', () => {
      const vcardText = `
BEGIN:VCARD
VERSION:3.0
FN:Priya Sharma
TEL;TYPE=CELL:+91 98111 22334
END:VCARD

BEGIN:VCARD
VERSION:3.0
FN:Vikram Malhotra
TEL;TYPE=HOME:9876543210
END:VCARD
`;
      const contacts = parseVCard(vcardText);
      expect(contacts).toHaveLength(2);
      expect(contacts[0]).toEqual({
        name: 'Priya Sharma',
        phone: '+91 98111 22334',
      });
      expect(contacts[1]).toEqual({
        name: 'Vikram Malhotra',
        phone: '9876543210',
      });
    });

    it('falls back to N: field if FN is missing', () => {
      const vcardText = `
BEGIN:VCARD
VERSION:2.1
N:Verma;Rohan
TEL;VOICE:+91 91234 56789
END:VCARD
`;
      const contacts = parseVCard(vcardText);
      expect(contacts).toHaveLength(1);
      expect(contacts[0].name).toBe('Rohan Verma');
      expect(contacts[0].phone).toBe('+91 91234 56789');
    });

    it('ignores cards without a phone number', () => {
      const vcardText = `
BEGIN:VCARD
VERSION:3.0
FN:No Phone Contact
EMAIL:test@example.com
END:VCARD
`;
      const contacts = parseVCard(vcardText);
      expect(contacts).toHaveLength(0);
    });
  });

  describe('parseCSVContacts', () => {
    it('parses CSV contacts with Name and Phone headers', () => {
      const csv = `Name,Phone
Arjun Patel,+91 97222 33445
Dr. Neha Sen,9845011223`;
      const contacts = parseCSVContacts(csv);
      expect(contacts).toHaveLength(2);
      expect(contacts[0]).toEqual({
        name: 'Arjun Patel',
        phone: '+91 97222 33445',
      });
      expect(contacts[1]).toEqual({
        name: 'Dr. Neha Sen',
        phone: '9845011223',
      });
    });

    it('handles quoted CSV headers like "Full Name", "Mobile Number"', () => {
      const csv = `"Full Name","Mobile Number"
"Ananya Iyer","+91 96333 44556"
"Rajesh Gupta","+91 98765 00112"`;
      const contacts = parseCSVContacts(csv);
      expect(contacts).toHaveLength(2);
      expect(contacts[0].name).toBe('Ananya Iyer');
      expect(contacts[0].phone).toBe('+91 96333 44556');
    });
  });

  describe('matchContactsWithProfiles', () => {
    const mockRegisteredProfiles: Profile[] = [
      {
        id: 'user-priya',
        username: 'priya_sharma',
        display_name: 'Priya Sharma',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        status_message: 'Building the future of Delta 🚀',
        phone_number: '+91 98111 22334',
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        privacy_last_seen: 'everyone',
        privacy_read_receipts: true,
      },
      {
        id: 'user-arjun',
        username: 'arjun_patel',
        display_name: 'Arjun Patel',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        status_message: 'Designing clean UI ✨',
        phone_number: '+91 97222 33445',
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        privacy_last_seen: 'everyone',
        privacy_read_receipts: true,
      },
    ];

    it('matches contacts by phone number irrespective of format differences', () => {
      const raw: RawContactInput[] = [
        // Different formats for Priya's 9811122334
        { name: 'Priya Work', phone: '09811122334' },
        // Unregistered contact
        { name: 'Dr. Neha Sen', phone: '+91 98450 11223' },
      ];

      const matched = matchContactsWithProfiles(raw, mockRegisteredProfiles);

      expect(matched).toHaveLength(2);

      // Registered user should be first
      const priyaMatch = matched.find((c) => c.phone_number === '09811122334');
      expect(priyaMatch).toBeDefined();
      expect(priyaMatch?.is_on_delta).toBe(true);
      expect(priyaMatch?.delta_user_id).toBe('user-priya');
      expect(priyaMatch?.delta_profile?.username).toBe('priya_sharma');

      // Unregistered contact
      const nehaMatch = matched.find((c) => c.name === 'Dr. Neha Sen');
      expect(nehaMatch).toBeDefined();
      expect(nehaMatch?.is_on_delta).toBe(false);
      expect(nehaMatch?.delta_user_id).toBeUndefined();
    });

    it('deduplicates identical phone numbers in the address book', () => {
      const raw: RawContactInput[] = [
        { name: 'Arjun', phone: '+91 97222 33445' },
        { name: 'Arjun Mobile', phone: '9722233445' },
      ];

      const matched = matchContactsWithProfiles(raw, mockRegisteredProfiles);
      expect(matched).toHaveLength(1);
      expect(matched[0].is_on_delta).toBe(true);
      expect(matched[0].delta_user_id).toBe('user-arjun');
    });

    it('correctly processes DEMO_PHONE_ADDRESS_BOOK against profiles', () => {
      const matched = matchContactsWithProfiles(DEMO_PHONE_ADDRESS_BOOK, mockRegisteredProfiles);
      expect(matched.length).toBeGreaterThan(0);

      const registered = matched.filter((c) => c.is_on_delta);
      const unregistered = matched.filter((c) => !c.is_on_delta);

      // Priya and Arjun are registered
      expect(registered.length).toBe(2);
      expect(unregistered.length).toBe(4);

      // Registered contacts must precede unregistered contacts
      expect(matched[0].is_on_delta).toBe(true);
      expect(matched[1].is_on_delta).toBe(true);
    });
  });
});
