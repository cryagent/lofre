import {
  applyFadeIn,
  applyFadeOut,
  createLoopingNoise,
  createLowpass,
  safeDisconnect,
  stopSources,
} from './shared.js';

export function createPulseTone(ctx, destination, track) {
  const output = ctx.createGain();
  const oscillator = ctx.createOscillator();
  const pulse = ctx.createOscillator();
  const pulseGain = ctx.createGain();
  const toneGain = ctx.createGain();
  const noise = createLoopingNoise(ctx, 'white', 2);
  const noiseFilter = createLowpass(ctx, 1200);
  const noiseGain = ctx.createGain();
  const now = ctx.currentTime;

  output.gain.setValueAtTime(0, now);
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(track.baseFrequency, now);
  pulse.type = 'sine';
  pulse.frequency.setValueAtTime(track.pulseFrequency, now);
  pulseGain.gain.setValueAtTime(0.22, now);
  toneGain.gain.setValueAtTime(0.34, now);
  noiseGain.gain.setValueAtTime(track.noiseLevel ?? 0.025, now);

  pulse.connect(pulseGain);
  pulseGain.connect(toneGain.gain);
  oscillator.connect(toneGain);
  toneGain.connect(output);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(output);
  output.connect(destination);

  oscillator.start();
  pulse.start();
  noise.start();
  applyFadeIn(output, 1, 1.2);

  const sources = [oscillator, pulse, noise];
  const nodes = [output, oscillator, pulse, pulseGain, toneGain, noise, noiseFilter, noiseGain];

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
