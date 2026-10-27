import { Profile, SyncedPhoneContact } from '@/types';
import { normalizePhoneNumber } from '@/lib/utils';

export interface RawContactInput {
  name: string;
  phone: string;
}

/**
 * Checks if the browser natively supports the Web Contacts Picker API
 * (Available in Chromium-based mobile browsers like Chrome on Android).
 */
export function isWebContactsSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return 'contacts' in navigator && 'ContactsManager' in window;
}

/**
 * Triggers native device contact picker via Web Contacts API if available.
 */
export async function pickNativeDeviceContacts(): Promise<RawContactInput[]> {
  if (!isWebContactsSupported()) {
    throw new Error('Web Contacts API is not supported on this browser or platform.');
  }

  try {
    const props = ['name', 'tel'];
    const opts = { multiple: true };
    const contacts = await (navigator as any).contacts.select(props, opts);
    
    const results: RawContactInput[] = [];
    for (const c of contacts) {
      const name = Array.isArray(c.name) ? c.name[0] : (c.name || 'Unnamed Contact');
      const phones = Array.isArray(c.tel) ? c.tel : [c.tel];
      for (const p of phones) {
        if (p) {
          results.push({ name: name.trim(), phone: p.trim() });
        }
      }
    }
    return results;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return [];
    }
    throw err;
  }
}

/**
 * Parses standard vCard (.vcf) formatted text exported from phone contacts.
 */
export function parseVCard(vcfText: string): RawContactInput[] {
  const contacts: RawContactInput[] = [];
  const cards = vcfText.split(/BEGIN:VCARD/i);

  for (const card of cards) {
    if (!card.trim()) continue;

    let name = '';
    let phone = '';

    const lines = card.split(/\r\n|\r|\n/);
    for (const line of lines) {
      const trimmed = line.trim();

      // Full Name
      if (trimmed.toUpperCase().startsWith('FN:')) {
        name = trimmed.substring(3).trim();
      } else if (!name && trimmed.toUpperCase().startsWith('N:')) {
        const parts = trimmed.substring(2).split(';');
        name = parts.filter(Boolean).reverse().join(' ').trim();
      }

      // Telephone Number
      if (trimmed.toUpperCase().startsWith('TEL') && trimmed.includes(':')) {
        const parts = trimmed.split(':');
        if (parts.length >= 2) {
          const candidatePhone = parts.slice(1).join(':').trim();
          if (!phone) {
            phone = candidatePhone;
          }
        }
      }
    }

    if (phone) {
      contacts.push({
        name: name || 'Contact ' + (contacts.length + 1),
        phone,
      });
    }
  }

  return contacts;
}

/**
 * Parses standard CSV address book export.
 */
export function parseCSVContacts(csvText: string): RawContactInput[] {
  const contacts: RawContactInput[] = [];
  const lines = csvText.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return contacts;

  const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/['"]/g, ''));
  const nameIdx = header.findIndex((h) => h.includes('name') || h === 'fn' || h === 'display name');
  const phoneIdx = header.findIndex((h) => h.includes('phone') || h.includes('mobile') || h.includes('tel') || h === 'cell');

  const actualNameIdx = nameIdx >= 0 ? nameIdx : 0;
  const actualPhoneIdx = phoneIdx >= 0 ? phoneIdx : 1;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (cols[actualPhoneIdx]) {
      contacts.push({
        name: cols[actualNameIdx] || 'Contact ' + i,
        phone: cols[actualPhoneIdx],
      });
    }
  }

  return contacts;
}

/**
 * Matches phone numbers against registered Delta profiles to detect who is on Delta.
 */
export function matchContactsWithProfiles(
  rawContacts: RawContactInput[],
  registeredProfiles: Profile[]
): SyncedPhoneContact[] {
  const now = new Date().toISOString();
  const seenPhones = new Set<string>();
  const synced: SyncedPhoneContact[] = [];

  for (const c of rawContacts) {
    if (!c.phone || !c.phone.trim()) continue;

    const digits = c.phone.replace(/\D/g, '');
    if (digits.length < 7) continue;

    const normalized = normalizePhoneNumber(c.phone);
    const keyDigits = digits.slice(-10);

    if (seenPhones.has(keyDigits)) continue;
    seenPhones.add(keyDigits);

    // Look for matching registered user in Delta
    const matchedProfile = registeredProfiles.find((p) => {
      if (!p.phone_number) return false;
      const pDigits = p.phone_number.replace(/\D/g, '');
      return pDigits.endsWith(keyDigits);
    });

    synced.push({
      id: `sync-${keyDigits}-${Date.now()}`,
      name: c.name || matchedProfile?.display_name || 'Contact',
      phone_number: c.phone,
      normalized_phone: normalized,
      is_on_delta: !!matchedProfile,
      delta_user_id: matchedProfile?.id,
      delta_profile: matchedProfile,
      synced_at: now,
    });
  }

  // Sort: registered users first, then alphabetically by name
  return synced.sort((a, b) => {
    if (a.is_on_delta && !b.is_on_delta) return -1;
    if (!a.is_on_delta && b.is_on_delta) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Realistic default phone address book sample for instant 1-click device sync
 * matching known registered users on Delta and contacts to invite.
 */
export const DEMO_PHONE_ADDRESS_BOOK: RawContactInput[] = [
  { name: 'Priya Sharma (Colleague)', phone: '+91 98111 22334' },
  { name: 'Arjun Patel (Design Lead)', phone: '+91 97222 33445' },
  { name: 'Ananya Iyer (Mobile Dev)', phone: '+91 96333 44556' },
  { name: 'Dr. Neha Sen (Cardiologist)', phone: '+91 98450 11223' },
  { name: 'Rajesh Gupta (Vendor)', phone: '+91 98765 00112' },
  { name: 'Kavita Menon (College Friend)', phone: '+91 98200 77665' },
];
