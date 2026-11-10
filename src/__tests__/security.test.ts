import { describe, it, expect } from 'vitest';
import { generateSafetyNumber, DELTA_SECURITY_SUMMARY, hashPassword } from '@/lib/security';

describe('Delta Security & Privacy Protocol', () => {
  it('hashes passwords securely using SHA-256 with deterministic salt', async () => {
    const rawPassword = 'MySecretPassword123!';
    const hash1 = await hashPassword(rawPassword);
    const hash2 = await hashPassword(rawPassword);

    expect(hash1).toBeDefined();
    expect(hash1.length).toBeGreaterThan(20);
    // Deterministic match
    expect(hash1).toBe(hash2);
    // Never matches plaintext
    expect(hash1).not.toBe(rawPassword);

    // Different passwords produce different hashes
    const differentHash = await hashPassword('DifferentPassword456!');
    expect(hash1).not.toBe(differentHash);
  });
  it('generates a 60-digit deterministic safety number in 12 blocks of 5 digits', () => {
    const blocks = generateSafetyNumber('user-priya-123', 'user-arjun-456');
    expect(blocks).toHaveLength(12);
    blocks.forEach((block) => {
      expect(block).toMatch(/^\d{5}$/);
    });
    const fullNumber = blocks.join('');
    expect(fullNumber).toHaveLength(60);
  });

  it('guarantees commutative symmetry (identical fingerprint regardless of caller order)', () => {
    const codeA = generateSafetyNumber('alice-uuid', 'bob-uuid');
    const codeB = generateSafetyNumber('bob-uuid', 'alice-uuid');
    expect(codeA).toEqual(codeB);
  });

  it('generates distinct cryptographic safety codes for different user pairs', () => {
    const codePair1 = generateSafetyNumber('alice-uuid', 'bob-uuid');
    const codePair2 = generateSafetyNumber('alice-uuid', 'charlie-uuid');
    expect(codePair1).not.toEqual(codePair2);
  });

  it('validates comprehensive security architecture parameters', () => {
    expect(DELTA_SECURITY_SUMMARY.encryption.cipher).toContain('AES-256-GCM');
    expect(DELTA_SECURITY_SUMMARY.encryption.forwardSecrecy).toBe(true);
    expect(DELTA_SECURITY_SUMMARY.rowLevelSecurity.enforced).toBe(true);
    expect(DELTA_SECURITY_SUMMARY.privacyControls.lastSeenConfigurable).toBe(true);
    expect(DELTA_SECURITY_SUMMARY.privacyControls.readReceiptsConfigurable).toBe(true);
    expect(DELTA_SECURITY_SUMMARY.privacyControls.disappearingMessagesSupported).toBe(true);
  });
});
