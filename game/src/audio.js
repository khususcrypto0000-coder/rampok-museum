// Rampok Museum — synthesized sound. Every sound is built from plain
// oscillators and noise, so the game ships no audio files at all.

export function createAudio() {
  let context = null;
  let muted = false;
  let alarmOsc = null;
  let alarmGain = null;

  function ensure() {
    if (!context) {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  }

  function tone(freq, seconds, type = 'sine', volume = 0.12, slideTo = null) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + seconds);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + seconds);
  }

  function noise(seconds, volume = 0.1, lowpass = 1200) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopAlarm();
      return muted;
    },
    isMuted() {
      return muted;
    },
    pickup() {
      tone(660, 0.09, 'sine', 0.1);
      setTimeout(() => tone(990, 0.12, 'sine', 0.1), 70);
    },
    coin() {
      tone(1180, 0.07, 'triangle', 0.08);
    },
    throwCoin() {
      noise(0.12, 0.06, 3000);
    },
    fuse() {
      tone(220, 0.15, 'square', 0.06, 110);
      setTimeout(() => tone(440, 0.2, 'square', 0.05), 120);
    },
    alarm() {
      tone(520, 0.35, 'sawtooth', 0.09, 780);
    },
    caught() {
      tone(300, 0.5, 'sawtooth', 0.12, 90);
      noise(0.3, 0.1, 800);
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.1), i * 110));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.09), i * 140));
    },
    startAlarm() {
      const ctx = ensure();
      if (!ctx || muted || alarmOsc) return;
      alarmOsc = ctx.createOscillator();
      alarmGain = ctx.createGain();
      alarmOsc.type = 'square';
      alarmOsc.frequency.value = 620;
      alarmGain.gain.value = 0.02;
      alarmOsc.connect(alarmGain);
      alarmGain.connect(ctx.destination);
      alarmOsc.start();
    },
    stopAlarm() {
      if (alarmOsc) {
        try {
          alarmOsc.stop();
        } catch {
          // Already stopped.
        }
        alarmOsc = null;
        alarmGain = null;
      }
    },
  };
}
