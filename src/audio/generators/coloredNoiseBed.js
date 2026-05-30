import {
  applyFadeIn,
  applyFadeOut,
  createHighpass,
  createLoopingNoise,
  createLowpass,
  createStereoPanner,
  safeDisconnect,
  stopSources,
} from './shared.js';

export function createColoredNoiseBed(ctx, destination, track) {
  const output = ctx.createGain();
  const noise = createLoopingNoise(ctx, track.noiseColor ?? 'pink', 4);
  const highpass = createHighpass(ctx, track.highpassHz ?? 60);
  const lowpass = createLowpass(ctx, track.lowpassHz ?? 2200);
  const gain = ctx.createGain();
  const panner = createStereoPanner(ctx, track.stereoWidth ?? 0);
  const sources = [noise];
  const nodes = [output, noise, highpass, lowpass, gain, panner];
  const now = ctx.currentTime;

  output.gain.setValueAtTime(0, now);
  gain.gain.setValueAtTime(track.noiseLevel ?? 0.04, now);

  if (track.modulationFrequency && track.modulationDepth) {
    const modOscillator = ctx.createOscillator();
    const modGain = ctx.createGain();

    modOscillator.type = 'sine';
    modOscillator.frequency.setValueAtTime(track.modulationFrequency, now);
    modGain.gain.setValueAtTime((track.noiseLevel ?? 0.04) * track.modulationDepth, now);
    modOscillator.connect(modGain);
    modGain.connect(gain.gain);
    modOscillator.start();
    sources.push(modOscillator);
    nodes.push(modOscillator, modGain);
  }

  if (track.filterDriftHz) {
    const drift = ctx.createOscillator();
    const driftGain = ctx.createGain();

    drift.type = 'sine';
    drift.frequency.setValueAtTime(track.filterDriftHz, now);
    driftGain.gain.setValueAtTime((track.lowpassHz ?? 2200) * 0.08, now);
    drift.connect(driftGain);
    driftGain.connect(lowpass.frequency);
    drift.start();
    sources.push(drift);
    nodes.push(drift, driftGain);
  }

  noise.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(panner);
  panner.connect(output);
  output.connect(destination);

  noise.start();
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
