let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playWhistleTone(startTime: number, duration: number, frequency: number = 2800): void {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, startTime);
  osc.frequency.setValueAtTime(frequency * 1.05, startTime + duration * 0.3);
  osc.frequency.setValueAtTime(frequency * 0.98, startTime + duration * 0.7);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.6, startTime + 0.02);
  gain.gain.setValueAtTime(0.6, startTime + duration - 0.05);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playSingleWhistle(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    playWhistleTone(now, 0.5, 2800);
  } catch (e) {
    // silently fail
  }
}

export function playDoubleWhistle(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;
    playWhistleTone(now, 0.45, 2800);
    playWhistleTone(now + 0.55, 0.45, 2800);
  } catch (e) {
    // silently fail
  }
}
