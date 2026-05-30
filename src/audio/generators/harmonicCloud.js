import {
  applyFadeIn,
  applyFadeOut,
  createLoopingNoise,
  createLowpass,
  createStereoPanner,
  safeDisconnect,
  stopSources,
} from "./shared.js";

export function createHarmonicCloud(ctx, destination, track) {
  const output = ctx.createGain();
  const finalFilter = createLowpass(ctx, track.filterCutoffHz ?? 2200);
  const drift = ctx.createOscillator();
  const driftGain = ctx.createGain();
  const sources = [drift];
  const nodes = [output, finalFilter, drift, driftGain];
  const now = ctx.currentTime;
  const baseFrequency = track.baseFrequency ?? 180;

  output.gain.setValueAtTime(0, now);
  drift.type = "sine";
  drift.frequency.setValueAtTime(track.driftFrequency ?? 0.008, now);
  driftGain.gain.setValueAtTime(track.driftDepthCents ?? 4, now);
  drift.connect(driftGain);

  (track.partials ?? [{ ratio: 1, type: "sine", gain: 0.06, pan: 0 }]).forEach((partial) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const panner = createStereoPanner(ctx, (partial.pan ?? 0) * (track.stereoWidth ?? 1));

    oscillator.type = partial.type ?? "sine";
    oscillator.frequency.setValueAtTime(baseFrequency * partial.ratio, now);
    oscillator.detune.setValueAtTime(partial.detuneCents ?? 0, now);
    gain.gain.setValueAtTime(partial.gain ?? 0.02, now);
    driftGain.connect(oscillator.detune);
    oscillator.connect(gain);
    gain.connect(panner);
    panner.connect(finalFilter);
    oscillator.start();
    sources.push(oscillator);
    nodes.push(oscillator, gain, panner);
  });

  if (track.shimmerLevel) {
    const shimmer = createLoopingNoise(ctx, "white", 3);
    const shimmerFilter = ctx.createBiquadFilter();
    const shimmerGain = ctx.createGain();

    shimmerFilter.type = "bandpass";
    shimmerFilter.frequency.setValueAtTime(track.shimmerBandHz ?? 2200, now);
    shimmerFilter.Q.setValueAtTime(0.8, now);
    shimmerGain.gain.setValueAtTime(track.shimmerLevel, now);
    shimmer.connect(shimmerFilter);
    shimmerFilter.connect(shimmerGain);
    shimmerGain.connect(finalFilter);
    shimmer.start();
    sources.push(shimmer);
    nodes.push(shimmer, shimmerFilter, shimmerGain);
  }

  finalFilter.connect(output);
  output.connect(destination);
  drift.start();
  applyFadeIn(output, 1, 1.5);

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
