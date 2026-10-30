/**
 * Delta Messaging Platform: Call Audio Tone Synthesizer
 * Uses Web Audio API to generate realistic calling, connection, and hangup tones
 * without requiring any external audio files or network requests.
 */

class CallAudioSynthesizer {
  private audioCtx: AudioContext | null = null;
  private ringInterval: any = null;
  private isRinging: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Starts playing the gentle dual-tone outgoing call ring (440Hz + 480Hz)
   */
  public startRingtone() {
    this.stopRingtone();
    const ctx = this.getContext();
    if (!ctx) return;

    this.isRinging = true;

    const playRingPulse = () => {
      if (!this.isRinging || !this.audioCtx) return;
      try {
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, this.audioCtx.currentTime); // Standard ring tone A4
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, this.audioCtx.currentTime); // Tone B4

        gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.04, this.audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.04, this.audioCtx.currentTime + 1.2);
        gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 1.4);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.audioCtx.currentTime + 1.4);
        osc2.stop(this.audioCtx.currentTime + 1.4);
      } catch {
        // Fallback gracefully if audio context restricted
      }
    };

    // Play initial pulse immediately then every 3 seconds (standard phone cadence)
    playRingPulse();
    this.ringInterval = setInterval(playRingPulse, 3000);
  }

  public stopRingtone() {
    this.isRinging = false;
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  /**
   * Plays a pleasant major chord chime when a call connects
   */
  public playConnectedChime() {
    this.stopRingtone();
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + idx * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.08 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.65);
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * Plays a soft hangup tone when a call ends
   */
  public playHangupTone() {
    this.stopRingtone();
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(425, ctx.currentTime);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio fallback
    }
  }

  /**
   * Plays a subtle, tactile pop sound when a message is sent
   */
  public playMessageSentTone() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }

  /**
   * Plays a gentle two-tone chime when a message is received
   */
  public playMessageReceivedTone() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.16);
    } catch {}
  }

  /**
   * Plays a celestial uplink tone when a packet is beamed directly to an orbital satellite
   */
  public playSatelliteUplinkTone() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const freqs = [659.25, 880, 1174.66, 1760]; // E5, A5, D6, A6 cosmic arpeggio
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);

        gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + idx * 0.06 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.06);
        osc.stop(ctx.currentTime + idx * 0.06 + 0.4);
      });
    } catch {}
  }
}

export const callAudio = new CallAudioSynthesizer();
