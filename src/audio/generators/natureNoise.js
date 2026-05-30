import {
  applyFadeIn,
  applyFadeOut,
  createHighpass,
  createLoopingNoise,
  createLowpass,
  createStereoPanner,
  safeDisconnect,
  stopSources,
} from "./shared.js";

function createDropletBuffer(ctx, track) {
  const durationSeconds = 6;
  const buffer = ctx.createBuffer(2, ctx.sampleRate * durationSeconds, ctx.sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const density = track.dropletDensity ?? 0.4;
  const totalDroplets = Math.floor(80 * density);

  for (let droplet = 0; droplet < totalDroplets; droplet += 1) {
    const start = Math.floor(Math.random() * left.length);
    const length = Math.floor(ctx.sampleRate * (0.008 + Math.random() * 0.035));
    const pan = Math.random();
    const amplitude = 0.02 + Math.random() * 0.04;

    for (let offset = 0; offset < length; offset += 1) {
      const index = (start + offset) % left.length;
      const envelope = Math.exp((-offset / length) * 6);
      const sample = (Math.random() * 2 - 1) * amplitude * envelope;
      left[index] += sample * (1 - pan);
      right[index] += sample * pan;
    }
  }

  return buffer;
}

function addModulation(ctx, targetParam, frequency, depth, sources, nodes) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(depth, ctx.currentTime);
  oscillator.connect(gain);
  gain.connect(targetParam);
  oscillator.start();
  sources.push(oscillator);
  nodes.push(oscillator, gain);
}

export function createNatureNoise(ctx, destination, track) {
  const output = ctx.createGain();
  const gain = ctx.createGain();
  const panner = createStereoPanner(ctx, track.stereoWidth ?? 0);
  const sources = [];
  const nodes = [output, gain, panner];
  const now = ctx.currentTime;
  const scene = track.scene ?? "ocean";
  const intensity = track.intensity ?? 0.4;

  output.gain.setValueAtTime(0, now);
  gain.gain.setValueAtTime(track.airLevel ?? 0.04, now);

  if (scene === "rain") {
    const air = createLoopingNoise(ctx, "pink", 3);
    const droplets = ctx.createBufferSource();
    const highpass = createHighpass(ctx, track.highpassHz ?? 120);
    const lowpass = createLowpass(ctx, track.lowpassHz ?? 2400);
    const dropletGain = ctx.createGain();

    droplets.buffer = createDropletBuffer(ctx, track);
    droplets.loop = true;
    dropletGain.gain.setValueAtTime(intensity * 0.12, now);
    air.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    droplets.connect(dropletGain);
    dropletGain.connect(output);
    air.start();
    droplets.start();
    sources.push(air, droplets);
    nodes.push(air, droplets, highpass, lowpass, dropletGain);
  } else {
    const color = scene === "ocean" ? "brown" : "pink";
    const noise = createLoopingNoise(ctx, color, 4);
    const highpass = createHighpass(ctx, track.highpassHz ?? 40);
    const lowpass = createLowpass(ctx, track.lowpassHz ?? 1000);

    noise.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    noise.start();
    sources.push(noise);
    nodes.push(noise, highpass, lowpass);

    if (scene === "ocean") {
      addModulation(ctx, gain.gain, track.waveRateHz ?? 0.06, intensity * 0.025, sources, nodes);
    }

    if (scene === "wind") {
      addModulation(ctx, gain.gain, track.gustRateHz ?? 0.04, intensity * 0.035, sources, nodes);
      addModulation(ctx, lowpass.frequency, track.gustRateHz ?? 0.04, 220, sources, nodes);
    }

    if (scene === "forest") {
      const blips = ctx.createBufferSource();
      const blipGain = ctx.createGain();

      blips.buffer = createDropletBuffer(ctx, {
        dropletDensity: 0.08,
      });
      blips.loop = true;
      blipGain.gain.setValueAtTime(0.035, now);
      blips.playbackRate.setValueAtTime(1.8, now);
      blips.connect(blipGain);
      blipGain.connect(output);
      blips.start();
      sources.push(blips);
      nodes.push(blips, blipGain);
    }
  }

  gain.connect(panner);
  panner.connect(output);
  output.connect(destination);
  applyFadeIn(output, 1, 1.6);

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
