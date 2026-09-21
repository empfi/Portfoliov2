// Procedural acoustic physical audio synthesizer
// High-fidelity physical wooden desk impact modeling

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.45, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Authentic physical desk landing sound (soft wooden muffled thud).
   * Models the low acoustic resonance of a solid wood table with dual-surface settle.
   */
  public playPutDown() {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;

    // 1. Primary Low-Frequency Wood Resonance (solid table body vibration)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle'; // triangle gives natural warm wood harmonics
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.08);

    oscGain.gain.setValueAtTime(0.35, t);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.08);

    // 2. Muffled Surface Contact Friction (filtered acoustic noise burst)
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.035);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(450, t); // Warm lowpass cuts any harshness
    noiseFilter.Q.setValueAtTime(1.0, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);

    // 3. Secondary micro-settle (~22ms later, realistic physical micro bounce)
    const t2 = t + 0.022;
    const osc2 = this.ctx.createOscillator();
    const osc2Gain = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(120, t2);
    osc2.frequency.exponentialRampToValueAtTime(50, t2 + 0.04);

    osc2Gain.gain.setValueAtTime(0.12, t2);
    osc2Gain.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.04);

    osc2.connect(osc2Gain);
    osc2Gain.connect(this.masterGain);
    osc2.start(t2);
    osc2.stop(t2 + 0.04);
  }
}

export const sound = new SoundManager();
