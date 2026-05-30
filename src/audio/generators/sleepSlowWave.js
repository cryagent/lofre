import {
  applyFadeIn,
  applyFadeOut,
  createLoopingNoise,
  createLowpass,
  createStereoPanner,
  safeDisconnect,
  stopSources,
} from "./shared.js";

export function createSleepSlowWave(ctx, destination, track) {
  const output = ctx.createGain();
  const noise = createLoopingNoise(ctx, track.noiseColor ?? "brown", 5);
  const lowpass = createLowpass(ctx, track.lowpassHz ?? 700);
  const gain = ctx.createGain();
  const panner = createStereoPanner(ctx, track.stereoWidth ?? 0);
  const sources = [noise];
  const nodes = [output, noise, lowpass, gain, panner];
  const now = ctx.currentTime;

  output.gain.setValueAtTime(0, now);
  gain.gain.setValueAtTime(track.noiseLevel ?? 0.05, now);

  if (track.slowPulseHz && track.pulseDepth) {
    const pulse = ctx.createOscillator();
    const pulseGain = ctx.createGain();

    pulse.type = "sine";
    pulse.frequency.setValueAtTime(track.slowPulseHz, now);
    pulseGain.gain.setValueAtTime((track.noiseLevel ?? 0.05) * track.pulseDepth, now);
    pulse.connect(pulseGain);
    pulseGain.connect(gain.gain);
    pulse.start();
    sources.push(pulse);
    nodes.push(pulse, pulseGain);
  }

  noise.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(panner);
  panner.connect(output);

  if (track.toneLevel) {
    const tone = ctx.createOscillator();
    const toneGain = ctx.createGain();

    tone.type = "sine";
    tone.frequency.setValueAtTime(track.baseFrequency ?? 96, now);
    toneGain.gain.setValueAtTime(track.toneLevel, now);
    tone.connect(toneGain);
    toneGain.connect(output);
    tone.start();
    sources.push(tone);
    nodes.push(tone, toneGain);
  }

  output.connect(destination);
  noise.start();
  applyFadeIn(output, 1, 2);

  return {
    nodes,
    stop() {
      const stopAt = applyFadeOut(output, 1.4);
      stopSources(sources, stopAt + 0.05);
    },
    dispose() {
      stopSources(sources, 0);
      safeDisconnect(nodes);
    },
  };
}
