import { applyFadeIn, applyFadeOut, safeDisconnect, stopSources } from './shared.js';

export function createPlainFrequency(ctx, destination, track) {
  const output = ctx.createGain();
  const oscillator = ctx.createOscillator();
  const toneGain = ctx.createGain();
  const now = ctx.currentTime;

  output.gain.setValueAtTime(0, now);
  oscillator.type = track.waveform ?? 'sine';
  oscillator.frequency.setValueAtTime(track.frequency, now);
  toneGain.gain.setValueAtTime(track.toneLevel ?? 0.06, now);

  oscillator.connect(toneGain);
  toneGain.connect(output);
  output.connect(destination);

  oscillator.start();
  applyFadeIn(output, 1, 1.2);

  const sources = [oscillator];
  const nodes = [output, oscillator, toneGain];

  return {
    nodes,
    stop() {
      const stopAt = applyFadeOut(output, 1.2);
      stopSources(sources, stopAt + 0.05);
    },
    dispose() {
      stopSources(sources, 0);
      safeDisconnect(nodes);
    },
  };
}
