export const DEFAULT_FADE_SECONDS = 1.2;

export function createNoiseBuffer(ctx, seconds = 2, color = "white") {
  const frameCount = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
  const output = buffer.getChannelData(0);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  let brown = 0;

  for (let index = 0; index < output.length; index += 1) {
    const white = Math.random() * 2 - 1;

    if (color === "pink") {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      output[index] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
      continue;
    }

    if (color === "brown") {
      brown = (brown + 0.02 * white) / 1.02;
      output[index] = brown * 3.5;
      continue;
    }

    output[index] = white * 0.55;
  }

  return buffer;
}

export function createLoopingNoise(ctx, color = "white", seconds = 2) {
  const source = ctx.createBufferSource();
  source.buffer = createNoiseBuffer(ctx, seconds, color);
  source.loop = true;
  return source;
}

export function applyFadeIn(gainNode, targetGain, seconds = DEFAULT_FADE_SECONDS) {
  const now = gainNode.context.currentTime;

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.linearRampToValueAtTime(targetGain, now + seconds);
}

export function applyFadeOut(gainNode, seconds = DEFAULT_FADE_SECONDS) {
  const now = gainNode.context.currentTime;
  const stopAt = now + seconds;
  const currentValue = Math.max(0.0001, gainNode.gain.value);

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(currentValue, now);
  gainNode.gain.linearRampToValueAtTime(0.0001, stopAt);

  return stopAt;
}

export function safeDisconnect(nodes) {
  nodes.forEach((node) => {
    try {
      node.disconnect();
    } catch {
      // Already disconnected or not an AudioNode.
    }
  });
}

export function createMasterChain(ctx, destination) {
  const masterGain = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();

  masterGain.gain.setValueAtTime(0.45, ctx.currentTime);
  compressor.threshold.setValueAtTime(-24, ctx.currentTime);
  compressor.knee.setValueAtTime(18, ctx.currentTime);
  compressor.ratio.setValueAtTime(4, ctx.currentTime);
  compressor.attack.setValueAtTime(0.02, ctx.currentTime);
  compressor.release.setValueAtTime(0.25, ctx.currentTime);

  masterGain.connect(compressor);
  compressor.connect(destination);

  return {
    input: masterGain,
    masterGain,
    compressor,
    nodes: [masterGain, compressor],
  };
}

export function createStereoPanner(ctx, pan = 0) {
  if (!ctx.createStereoPanner) {
    return ctx.createGain();
  }

  const panner = ctx.createStereoPanner();
  panner.pan.setValueAtTime(pan, ctx.currentTime);
  return panner;
}

export function createLowpass(ctx, frequency = 1200) {
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(frequency, ctx.currentTime);
  return filter;
}

export function createHighpass(ctx, frequency = 40) {
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(frequency, ctx.currentTime);
  return filter;
}

export function stopSources(sources, stopAt) {
  sources.forEach((source) => {
    try {
      source.stop(stopAt);
    } catch {
      // Source may already be stopped.
    }
  });
}
