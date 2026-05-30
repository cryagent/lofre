import { createAmbientChimes } from "./ambientChimes.js";
import { createBinauralBeat } from "./binauralBeat.js";
import { createBreathPulseToneV2 } from "./breathPulseToneV2.js";
import { createColoredNoiseBed } from "./coloredNoiseBed.js";
import { createHarmonicCloud } from "./harmonicCloud.js";
import { createIsochronicTone } from "./isochronicTone.js";
import { createLayeredDrone } from "./layeredDrone.js";
import { createNatureNoise } from "./natureNoise.js";
import { createPlainFrequency } from "./plainFrequency.js";
import { createPulseTone } from "./pulseTone.js";
import { createSleepSlowWave } from "./sleepSlowWave.js";

export const generators = {
  "pulse-tone": createPulseTone,
  "layered-drone": createLayeredDrone,
  "ambient-chimes": createAmbientChimes,
  "breath-pulse-tone-v2": createBreathPulseToneV2,
  "colored-noise-bed": createColoredNoiseBed,
  "binaural-beat": createBinauralBeat,
  "isochronic-tone": createIsochronicTone,
  "nature-noise": createNatureNoise,
  "plain-frequency": createPlainFrequency,
  "harmonic-cloud": createHarmonicCloud,
  "sleep-slow-wave": createSleepSlowWave,
};
