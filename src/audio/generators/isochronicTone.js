import {
  applyFadeIn,
  applyFadeOut,
  createLoopingNoise,
  createLowpass,
  safeDisconnect,
  stopSources,
} from "./shared.js";

function schedulePulses(ctx, gain, track, startAt) {
  const beatFrequency = track.beatFrequency ?? 16;
  const period = 1 / beatFrequency;
  const dutyCycle = track.dutyCycle ?? 0.5;
  const highGain = track.toneLevel ?? 0.024;
  const lowGain = highGain * (1 - (track.modulationDepth ?? 0.24));
  const smoothing = (track.clickSmoothingMs ?? 20) / 1000;

  gain.gain.cancelScheduledValues(startAt);
  gain.gain.setValueAtTime(lowGain, startAt);

  for (let offset = 0; offset < 4; offset += period) {
    const pulseStart = startAt + offset;
    const pulseEnd = pulseStart + period * dutyCycle;

    gain.gain.linearRampToValueAtTime(highGain, pulseStart + smoothing);
    gain.gain.setValueAtTime(highGain, Math.max(pulseStart + smoothing, pulseEnd - smoothing));
    gain.gain.linearRampToValueAtTime(lowGain, pulseEnd);
  }
}

export function createIsochronicTone(ctx, destination, track) {
  const output = ctx.createGain();
  const tone = ctx.createOscillator();
  const toneGain = ctx.createGain();
  const sources = [tone];
  const nodes = [output, tone, toneGain];
  const now = ctx.currentTime;
  let schedulerId = null;

  output.gain.setValueAtTime(0, now);
  tone.type = "sine";
  tone.frequency.setValueAtTime(track.baseFrequency ?? 200, now);
  schedulePulses(ctx, toneGain, track, now);
  schedulerId = window.setInterval(() => {
    schedulePulses(ctx, toneGain, track, ctx.currentTime + 0.04);
  }, 1800);

  tone.connect(toneGain);
  toneGain.connect(output);

  if (track.noiseLevel) {
    const noise = createLoopingNoise(ctx, "pink", 3);
    const filter = createLowpass(ctx, track.lowpassHz ?? 2200);
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
  tone.start();
  applyFadeIn(output, 1, 0.8);

  return {
    nodes,
    stop() {
      window.clearInterval(schedulerId);
      const stopAt = applyFadeOut(output, 0.8);
      stopSources(sources, stopAt + 0.05);
    },
    dispose() {
      window.clearInterval(schedulerId);
      stopSources(sources, 0);
      safeDisconnect(nodes);
    },
  };
}
