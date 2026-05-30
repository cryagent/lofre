import { generators } from "./generators/index.js";
import { createMasterChain, safeDisconnect } from "./generators/shared.js";

const FADE_SECONDS = 1.2;

export function createAudioEngine() {
  let audioContext = null;
  let masterChain = null;
  let currentHandle = null;

  function getAudioContext() {
    if (!audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContext();
      masterChain = createMasterChain(audioContext, audioContext.destination);
    }

    return audioContext;
  }

  async function ensureRunning() {
    const ctx = getAudioContext();

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    return ctx;
  }

  function disposeHandle(handle) {
    if (!handle) {
      return;
    }

    handle.dispose();
  }

  async function playTrack(track) {
    const ctx = await ensureRunning();
    const createGenerator = generators[track.generator] ?? generators["pulse-tone"];
    const previousHandle = currentHandle;

    if (previousHandle) {
      previousHandle.stop();
      window.setTimeout(
        () => {
          disposeHandle(previousHandle);
        },
        (FADE_SECONDS + 0.2) * 1000,
      );
    }

    currentHandle = createGenerator(ctx, masterChain.input, track);
  }

  function stopCurrentTrack() {
    if (!currentHandle) {
      return;
    }

    const handle = currentHandle;
    currentHandle = null;
    handle.stop();
    window.setTimeout(
      () => {
        disposeHandle(handle);
      },
      (FADE_SECONDS + 0.2) * 1000,
    );
  }

  function setMasterVolume(value) {
    const ctx = getAudioContext();
    masterChain.masterGain.gain.setTargetAtTime(Number(value), ctx.currentTime, 0.05);
  }

  function dispose() {
    disposeHandle(currentHandle);
    currentHandle = null;

    if (masterChain) {
      safeDisconnect(masterChain.nodes);
      masterChain = null;
    }
  }

  return {
    playTrack,
    stopCurrentTrack,
    setMasterVolume,
    dispose,
  };
}
