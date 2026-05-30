import {
  applyFadeIn,
  applyFadeOut,
  createLoopingNoise,
  createLowpass,
  createStereoPanner,
  safeDisconnect,
  stopSources,
} from './shared.js';

function scheduleBreath(ctx, gain, track, startAt) {
  const breathRateHz = track.breathRateHz ?? 0.09;
  const cycleSeconds = 1 / breathRateHz;
  const inhaleSeconds = cycleSeconds * (track.inhaleRatio ?? 0.4);
  const exhaleSeconds = cycleSeconds - inhaleSeconds;
  const toneLevel = track.toneLevel ?? 0.06;
  const depth = track.modulationDepth ?? 0.32;
  const lowGain = Math.max(0.012, toneLevel * (1 - depth));
  const highGain = toneLevel;

  gain.gain.cancelScheduledValues(startAt);
  gain.gain.setValueAtTime(lowGain, startAt);

  for (let offset = 0; offset < 90; offset += cycleSeconds) {
    const cycleStart = startAt + offset;
    gain.gain.linearRampToValueAtTime(highGain, cycleStart + inhaleSeconds);
    gain.gain.linearRampToValueAtTime(lowGain, cycleStart + inhaleSeconds + exhaleSeconds);
  }
}

export function createBreathPulseToneV2(ctx, destination, track) {
  const output = ctx.createGain();
  const tone = ctx.createOscillator();
  const toneGain = ctx.createGain();
  const tonePanner = createStereoPanner(ctx, -(track.stereoWidth ?? 0.2));
  const noise = createLoopingNoise(ctx, track.noiseColor ?? 'brown', 3);
  const noiseFilter = createLowpass(ctx, track.lowpassHz ?? 900);
  const noiseGain = ctx.createGain();
  const noisePanner = createStereoPanner(ctx, track.stereoWidth ?? 0.2);
  const now = ctx.currentTime;
  let schedulerId = null;

  output.gain.setValueAtTime(0, now);
  tone.type = 'sine';
  tone.frequency.setValueAtTime(track.baseFrequency ?? 110, now);
  noiseGain.gain.setValueAtTime(track.noiseLevel ?? 0.03, now);

  scheduleBreath(ctx, toneGain, track, now);
  schedulerId = window.setInterval(() => {
    scheduleBreath(ctx, toneGain, track, ctx.currentTime + 0.05);
  }, 45000);

  tone.connect(toneGain);
  toneGain.connect(tonePanner);
  tonePanner.connect(output);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(noisePanner);
  noisePanner.connect(output);
  output.connect(destination);

  tone.start();
  noise.start();
  applyFadeIn(output, 1, 1.5);

  const sources = [tone, noise];
  const nodes = [output, tone, toneGain, tonePanner, noise, noiseFilter, noiseGain, noisePanner];

  return {
    nodes,
    stop() {
      window.clearInterval(schedulerId);
      const stopAt = applyFadeOut(output, 1.2);
      stopSources(sources, stopAt + 0.05);
    },
    dispose() {
      window.clearInterval(schedulerId);
      stopSources(sources, 0);
      safeDisconnect(nodes);
    },
  };
}
