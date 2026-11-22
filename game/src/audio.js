// A tiny WebAudio synth — no audio files at all. A coin's ring, a loot
// chime that climbs with the take, the soft thump of smoke, a lock's
// click, the vault's deep clang, and the alarm's sting when it trips.
// Every sound is a short list of notes: frequency, delay, length, wave,
// loudness, and an optional pitch to slide to.

export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  // One note through a gain envelope. Silent when muted or when there is
  // no audio context yet.
  function note(freq, at, dur, type, gain, slideTo) {
    const ac = ensure();
    if (!ac || muted) return;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    const t0 = ac.currentTime + at;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Play a list of notes, each [freq, at, dur, type, gain, slideTo?].
  function play(list) {
    for (const n of list) note(n[0], n[1], n[2], n[3], n[4], n[5]);
  }

  return {
    unlock() {
      const ac = ensure();
      if (ac && ac.state === 'suspended') ac.resume();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    seen() {
      play([[196, 0, 0.28, 'sawtooth', 0.045, 294]]);
    },
    loot(bag) {
      const base = 620 + Math.min(bag, 10) * 40;
      play([
        [base, 0, 0.1, 'sine', 0.11],
        [base * 1.335, 0.06, 0.16, 'sine', 0.09],
      ]);
    },
    coin() {
      play([
        [2093, 0, 0.09, 'sine', 0.08],
        [2093, 0.13, 0.09, 'sine', 0.06],
        [2637, 0.26, 0.14, 'sine', 0.05],
      ]);
    },
    smoke() {
      play([[300, 0, 0.3, 'sine', 0.07, 120]]);
    },
    door() {
      play([
        [440, 0, 0.06, 'square', 0.06],
        [587, 0.08, 0.12, 'square', 0.05],
      ]);
    },
    vault() {
      play([
        [98, 0, 0.5, 'triangle', 0.16],
        [523, 0.25, 0.16, 'sine', 0.1],
        [784, 0.38, 0.26, 'sine', 0.1],
      ]);
    },
    trip() {
      play([
        [880, 0, 0.16, 'square', 0.07],
        [880, 0.22, 0.16, 'square', 0.07],
        [1174, 0.44, 0.24, 'square', 0.06],
      ]);
    },
    caught() {
      play([
        [320, 0, 0.22, 'sawtooth', 0.12, 160],
        [210, 0.14, 0.34, 'sawtooth', 0.11, 90],
      ]);
    },
    getaway() {
      play([
        [523, 0, 0.13, 'triangle', 0.13],
        [659, 0.09, 0.13, 'triangle', 0.13],
        [784, 0.18, 0.13, 'triangle', 0.13],
        [1046, 0.27, 0.26, 'triangle', 0.14],
      ]);
    },
    click() {
      play([[660, 0, 0.05, 'sine', 0.06]]);
    },
  };
}
