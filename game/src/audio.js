// Small sounds, synthesised with WebAudio — no audio files to ship. The
// context starts on the first user gesture, so the title screen stays silent
// until the player presses a key or clicks.
export function createAudio() {
  let context = null;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function blip(frequency, seconds, type, gainValue, slideTo) {
    const audio = ensure();
    if (!audio) return;
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + seconds);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + seconds + 0.02);
  }

  return {
    unlock() {
      ensure();
    },
    coin() {
      blip(1320, 0.12, 'sine', 0.12, 1760);
    },
    jam() {
      blip(660, 0.08, 'square', 0.08, 330);
      setTimeout(() => blip(440, 0.12, 'square', 0.07, 220), 70);
    },
    pick() {
      blip(880, 0.1, 'triangle', 0.1, 1174);
    },
    loot() {
      blip(523, 0.18, 'sine', 0.14, 784);
      setTimeout(() => blip(1046, 0.25, 'sine', 0.12, 1318), 90);
    },
    spotted() {
      blip(220, 0.3, 'sawtooth', 0.1, 440);
    },
    caught() {
      blip(330, 0.5, 'sawtooth', 0.14, 110);
    },
    clear() {
      blip(523, 0.15, 'triangle', 0.12, 659);
      setTimeout(() => blip(784, 0.3, 'triangle', 0.12, 1046), 120);
    },
  };
}
