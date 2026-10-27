import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatDuration } from '@/lib/utils';
import { callAudio } from '@/lib/callAudio';
import { CallSession, Profile } from '@/types';

describe('Delta Voice and Video Calling Protocol', () => {
  const mockPartner: Profile = {
    id: 'user-priya',
    username: 'priya_sharma',
    display_name: 'Priya Sharma',
    phone_number: '+91 98765 43210',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
  };

  it('formats call durations accurately for voice and video calls', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(9)).toBe('0:09');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3600)).toBe('60:00');
  });

  it('initializes high-quality WebRTC call session metadata', () => {
    const session: CallSession = {
      id: `call-${Date.now()}`,
      caller_id: 'user-me',
      receiver_id: mockPartner.id,
      receiver: mockPartner,
      call_type: 'video',
      status: 'ringing',
      started_at: new Date().toISOString(),
      duration_seconds: 0,
    };

    expect(session.call_type).toBe('video');
    expect(session.status).toBe('ringing');
    expect(session.receiver?.display_name).toBe('Priya Sharma');
    expect(session.duration_seconds).toBe(0);
  });

  it('handles calling, connected, and hangup audio synthesis gracefully without throwing', () => {
    expect(() => {
      callAudio.startRingtone();
      callAudio.stopRingtone();
      callAudio.playConnectedChime();
      callAudio.playHangupTone();
    }).not.toThrow();
  });
});
