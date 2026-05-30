import { applyFadeIn, applyFadeOut, safeDisconnect, stopSources } from "./shared.js";

function createAmbientChimesBuffer(ctx, track) {
  const durationSeconds = 18;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * durationSeconds, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  const frequencies = track.chimeFrequencies ?? [293.66, 369.99, 440, 554.37];
  const totalChimes = Math.max(1, Math.floor(durationSeconds * (track.chimeDensity ?? 0.5)));
  let airSample = 0;

  for (let index = 0; index < output.length; index += 1) {
    airSample = airSample * 0.985 + (Math.random() * 2 - 1) * 0.015;
    output[index] = airSample * (track.airLevel ?? 0.018);
  }

  for (let chimeIndex = 0; chimeIndex < totalChimes; chimeIndex += 1) {
    const frequency = frequencies[chimeIndex % frequencies.length];
    const startAt = Math.floor(((chimeIndex + Math.random() * 0.55) / totalChimes) * output.length);
    const decaySamples = Math.floor(ctx.sampleRate * (2.2 + Math.random() * 1.8));
    const amplitude = 0.04 + Math.random() * 0.035;
    const detuneRatio = 1 + (Math.random() * 2 - 1) * 0.003;

    for (let offset = 0; offset < decaySamples; offset += 1) {
      const sampleIndex = (startAt + offset) % output.length;
      const time = offset / ctx.sampleRate;
      const envelope = Math.exp(-time * 1.85);
      const softAttack = Math.min(1, offset / (ctx.sampleRate * 0.08));
      const fundamental = Math.sin(2 * Math.PI * frequency * detuneRatio * time);
      const overtone = Math.sin(2 * Math.PI * frequency * 2.01 * time) * 0.38;

      output[sampleIndex] += (fundamental + overtone) * envelope * softAttack * amplitude;
    }
  }

  return buffer;
}

export function createAmbientChimes(ctx, destination, track) {
  const output = ctx.createGain();
  const chimes = ctx.createBufferSource();
  const chimeFilter = ctx.createBiquadFilter();
  const chimeGain = ctx.createGain();
  const delay = ctx.createDelay(4);
  const delayFeedback = ctx.createGain();
  const delayGain = ctx.createGain();
  const now = ctx.currentTime;

  output.gain.setValueAtTime(0, now);
  chimes.buffer = createAmbientChimesBuffer(ctx, track);
  chimes.loop = true;
  chimeFilter.type = "lowpass";
  chimeFilter.frequency.setValueAtTime(1800, now);
  chimeFilter.Q.setValueAtTime(0.6, now);
  chimeGain.gain.setValueAtTime(0.8, now);
  delay.delayTime.setValueAtTime(1.35, now);
  delayFeedback.gain.setValueAtTime(0.28, now);
  delayGain.gain.setValueAtTime(0.18, now);

  chimes.connect(chimeFilter);
  chimeFilter.connect(chimeGain);
  chimeGain.connect(output);
  chimeGain.connect(delay);
  delay.connect(delayFeedback);
  delayFeedback.connect(delay);
  delay.connect(delayGain);
  delayGain.connect(output);
  output.connect(destination);

  chimes.start();
  applyFadeIn(output, 1, 1.2);

  const sources = [chimes];
  const nodes = [output, chimes, chimeFilter, chimeGain, delay, delayFeedback, delayGain];

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
