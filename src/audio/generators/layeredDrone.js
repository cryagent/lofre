import {
  applyFadeIn,
  applyFadeOut,
  createLoopingNoise,
  safeDisconnect,
  stopSources,
} from './shared.js';

export function createLayeredDrone(ctx, destination, track) {
  const output = ctx.createGain();
  const drift = ctx.createOscillator();
  const driftGain = ctx.createGain();
  const shimmer = createLoopingNoise(ctx, 'white', 2);
  const shimmerFilter = ctx.createBiquadFilter();
  const shimmerGain = ctx.createGain();
  const sources = [drift, shimmer];
  const nodes = [output, drift, driftGain, shimmer, shimmerFilter, shimmerGain];
  const now = ctx.currentTime;

  output.gain.setValueAtTime(0, now);
  drift.type = 'sine';
  drift.frequency.setValueAtTime(track.driftFrequency ?? 0.01, now);
  driftGain.gain.setValueAtTime((track.baseFrequency ?? 160) * 0.012, now);
  drift.connect(driftGain);

  (track.chordRatios ?? [1, 1.5, 2]).forEach((ratio, index) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = index === 0 ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime((track.baseFrequency ?? 160) * ratio, now);
    gain.gain.setValueAtTime(0.15 / (index + 1), now);
    driftGain.connect(oscillator.detune);
    oscillator.connect(gain);
    gain.connect(output);
    oscillator.start();
    sources.push(oscillator);
    nodes.push(oscillator, gain);
  });

  shimmerFilter.type = 'bandpass';
  shimmerFilter.frequency.setValueAtTime((track.baseFrequency ?? 160) * 6, now);
  shimmerFilter.Q.setValueAtTime(0.75, now);
  shimmerGain.gain.setValueAtTime(track.shimmerLevel ?? 0.006, now);

  shimmer.connect(shimmerFilter);
  shimmerFilter.connect(shimmerGain);
  shimmerGain.connect(output);
  output.connect(destination);

  drift.start();
  shimmer.start();
  applyFadeIn(output, 1, 1.2);

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
