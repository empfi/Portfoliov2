// Procedural acoustic physical audio synthesizer
// High-fidelity physical wooden desk impact modeling with zero clipping/pops

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.init();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true, passive: true });
      window.addEventListener('keydown', unlock, { once: true, passive: true });
    }
  }

  private init() {
    if (typeof window === 'undefined') return;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();

      // Master limiter/compressor prevents any digital clipping/distortion
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-6, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.1, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
      this.masterGain.connect(this.compressor);

      // Pre-compute 40ms organic wood noise buffer once
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Smooth, authentic physical desk landing sound (soft wooden muffled thud).
   * Uses smooth micro-attack curves to completely eliminate clicks and glitches.
   */
  public playPutDown() {
    this.init();
    if (!this.ctx || !this.masterGain || this.ctx.state !== 'running') return;

    const t = this.ctx.currentTime;

    // 1. Primary low-frequency wood body vibration (smooth triangle wave)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(36, t + 0.09);

    // Smooth 5ms micro-attack prevents digital waveform pop
    oscGain.gain.setValueAtTime(0.0001, t);
    oscGain.gain.linearRampToValueAtTime(0.35, t + 0.005);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.09);

    // 2. Muffled surface contact friction (warm lowpass filtered noise)
    if (this.noiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(420, t);
      noiseFilter.Q.setValueAtTime(1.0, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, t);
      noiseGain.gain.linearRampToValueAtTime(0.25, t + 0.004);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noise.start(t);
    }

    // 3. Secondary micro-settle (~24ms later, physical contact settle)
    const t2 = t + 0.024;
    const osc2 = this.ctx.createOscillator();
    const osc2Gain = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(115, t2);
    osc2.frequency.exponentialRampToValueAtTime(48, t2 + 0.045);

    osc2Gain.gain.setValueAtTime(0.0001, t2);
    osc2Gain.gain.linearRampToValueAtTime(0.14, t2 + 0.004);
    osc2Gain.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.045);

    osc2.connect(osc2Gain);
    osc2Gain.connect(this.masterGain);
    osc2.start(t2);
    osc2.stop(t2 + 0.045);
  }
}

export const sound = new SoundManager();
