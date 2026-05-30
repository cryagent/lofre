import {
  applyFadeIn,
  applyFadeOut,
  createLoopingNoise,
  createLowpass,
  safeDisconnect,
  stopSources,
} from './shared.js';

export function createBinauralBeat(ctx, destination, track) {
  const output = ctx.createGain();
  const left = ctx.createOscillator();
  const right = ctx.createOscillator();
  const leftGain = ctx.createGain();
  const rightGain = ctx.createGain();
  const merger = ctx.createChannelMerger(2);
  const sources = [left, right];
  const nodes = [output, left, right, leftGain, rightGain, merger];
  const now = ctx.currentTime;
  const carrier = track.carrierFrequency ?? 200;
  const beat = track.beatFrequency ?? 8;
  const rampSeconds = track.rampSeconds ?? 4;

  output.gain.setValueAtTime(0, now);
  left.type = 'sine';
  right.type = 'sine';
  left.frequency.setValueAtTime(carrier - beat / 2, now);
  right.frequency.setValueAtTime(carrier + beat / 2, now);
  leftGain.gain.setValueAtTime(0.0001, now);
  rightGain.gain.setValueAtTime(0.0001, now);
  leftGain.gain.linearRampToValueAtTime(track.toneLevel ?? 0.03, now + rampSeconds);
  rightGain.gain.linearRampToValueAtTime(track.toneLevel ?? 0.03, now + rampSeconds);

  left.connect(leftGain);
  right.connect(rightGain);
  leftGain.connect(merger, 0, 0);
  rightGain.connect(merger, 0, 1);
  merger.connect(output);

  if (track.noiseLevel) {
    const noise = createLoopingNoise(ctx, track.noiseColor ?? 'pink', 3);
    const filter = createLowpass(ctx, track.lowpassHz ?? 1600);
    const noiseGain = ctx.createGain();

    noiseGain.gain.setValueAtTime(track.noiseLevel, now);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(output);
    noise.start();
    sources.push(noise);
    nodes.push(noise, filter, noiseGain);
  }

  output.connect(destination);
  left.start();
  right.start();
  applyFadeIn(output, 1, 1.4);

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
