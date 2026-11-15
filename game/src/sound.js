// Every sound is synthesised with WebAudio: no audio files, nothing to download. A soft
// chime when a mote is caught (its pitch climbs with the combo), a whoosh on the gust boost,
// a low thud when a storm cloud hits, and a little rising arpeggio when the level changes.
export function createSound() {
  let context = null;
  let muted = false;
  let whooshAt = 0;

  function ensure() {
    if (context === null) {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  }

  function tone(freq, dur, type, gain, when = 0, slideTo = null) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, gain, freq, when = 0) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(amp).connect(ctx.destination);
    src.start(t0);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    mote(combo) {
      // Pentatonic ladder: the pitch climbs as the combo grows, then wraps.
      const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      const note = scale[Math.min(combo, scale.length * 2 - 1) % scale.length] * (combo >= scale.length ? 2 : 1);
      tone(note, 0.28, 'sine', 0.16);
      tone(note * 2, 0.18, 'sine', 0.05);
    },
    ring() {
      tone(392, 0.18, 'triangle', 0.14);
      tone(523.25, 0.18, 'triangle', 0.14, 0.07);
      tone(659.25, 0.3, 'triangle', 0.14, 0.14);
    },
    boost() {
      const now = performance.now();
      if (now - whooshAt < 350) return;
      whooshAt = now;
      noise(0.35, 0.1, 900);
      tone(220, 0.3, 'sine', 0.05, 0, 440);
    },
    hit() {
      tone(110, 0.35, 'sawtooth', 0.16, 0, 55);
      noise(0.25, 0.14, 300);
    },
    levelUp() {
      tone(523.25, 0.16, 'triangle', 0.12);
      tone(659.25, 0.16, 'triangle', 0.12, 0.09);
      tone(783.99, 0.16, 'triangle', 0.12, 0.18);
      tone(1046.5, 0.3, 'triangle', 0.12, 0.27);
    },
    gameOver() {
      tone(392, 0.25, 'triangle', 0.12);
      tone(311.13, 0.25, 'triangle', 0.12, 0.18);
      tone(233.08, 0.5, 'triangle', 0.12, 0.36);
    },
  };
}
