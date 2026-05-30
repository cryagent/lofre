import './style.css';
import { createAudioEngine } from './audio/engine.js';
import { tracks } from './audio/tracks.js';

const CONFIG = {
  defaultTrackId: 'solfeggio-852hz',
  storageFavoritesKey: 'lofre-favorite-tracks',
  storageThemeKey: 'lofre-theme',
  tracks,
};

const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const engine = createAudioEngine();

function getStoredFavoriteTracks() {
  try {
    const storedValue = JSON.parse(localStorage.getItem(CONFIG.storageFavoritesKey) ?? '[]');

    if (!Array.isArray(storedValue)) {
      return new Map();
    }

    const trackIds = new Set(CONFIG.tracks.map((track) => track.id));
    const favoriteTracks = new Map();

    storedValue.forEach((favorite, index) => {
      const trackId = typeof favorite === 'string' ? favorite : favorite?.id;
      const addedAt =
        favorite && typeof favorite === 'object' && Number.isFinite(favorite.addedAt)
          ? favorite.addedAt
          : Date.now() - index;

      if (trackIds.has(trackId)) {
        favoriteTracks.set(trackId, addedAt);
      }
    });

    return favoriteTracks;
  } catch {
    return new Map();
  }
}

const state = {
  favoriteTracks: getStoredFavoriteTracks(),
  isPlaying: false,
  selectedTrack:
    CONFIG.tracks.find((track) => track.id === CONFIG.defaultTrackId) ?? CONFIG.tracks[0],
  theme: localStorage.getItem(CONFIG.storageThemeKey) ?? preferredTheme,
  selectedTimerHours: 0,
  selectedTimerMinutes: 0,
  timerDurationSeconds: 0,
  timerEndsAt: null,
  timerInterval: null,
  isTrackMenuOpen: false,
  volume: 0.45,
};

const trackDropdown = document.querySelector('.track-dropdown');
const trackDropdownTrigger = document.querySelector('.track-dropdown-trigger');
const trackDropdownMenu = document.querySelector('.track-dropdown-menu');
const trackSelectValue = document.querySelector('[data-track-select-value]');
const playButton = document.querySelector('.play-button');
const themeToggle = document.querySelector('.theme-toggle');
const moreButton = document.querySelector('.more-button');
const timerTrigger = document.querySelector('.timer-trigger');
const timerModal = document.querySelector('.timer-modal');
const timerModalClear = document.querySelector('.timer-modal-clear');
const timerModalClose = document.querySelector('.timer-modal-close');
const projectModal = document.querySelector('.project-modal');
const projectModalClose = document.querySelector('.project-modal-close');
const projectModalShare = document.querySelector('.project-modal-share');
const projectModalInstall = document.querySelector('.project-modal-install');
const timerStatuses = document.querySelectorAll('.timer-status');
const volumeInput = document.querySelector('input[type="range"]');
const waveLoader = document.querySelector('.wave-loader');

let deferredInstallPrompt = null;

volumeInput.value = state.volume;
renderVolumeProgress();

function getTrackLabel(track) {
  return track.headphoneOnly ? `${track.name} · Headphones` : track.name;
}

function renderVolumeProgress() {
  volumeInput.style.setProperty('--volume-progress', `${state.volume * 100}%`);
}

function renderTheme() {
  document.documentElement.dataset.theme = state.theme;
  themeToggle.textContent = state.theme === 'dark' ? 'Light' : 'Dark';
  themeToggle.setAttribute('aria-pressed', String(state.theme === 'dark'));
  localStorage.setItem(CONFIG.storageThemeKey, state.theme);
}

function resetProjectShareLabel() {
  window.setTimeout(() => {
    projectModalShare.textContent = 'Share';
  }, 1800);
}

function isStandaloneApp() {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

function renderInstallAction() {
  if (isStandaloneApp()) {
    projectModalInstall.textContent = 'Installed';
    projectModalInstall.disabled = true;
    return;
  }

  if (deferredInstallPrompt) {
    projectModalInstall.textContent = 'Install App';
    projectModalInstall.disabled = false;
    return;
  }

  projectModalInstall.textContent = 'Works Offline';
  projectModalInstall.disabled = true;
}

function saveFavoriteTracks() {
  const favoriteTracks = [...state.favoriteTracks].map(([id, addedAt]) => ({
    id,
    addedAt,
  }));

  localStorage.setItem(CONFIG.storageFavoritesKey, JSON.stringify(favoriteTracks));
}

function formatTimer(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(remainingSeconds).padStart(2, '0'),
  ].join(':');
}

function formatTimerSelection(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return [String(hours).padStart(2, '0'), String(minutes).padStart(2, '0')].join(':');
}

function setTimerDuration() {
  state.timerDurationSeconds = state.selectedTimerHours * 60 * 60 + state.selectedTimerMinutes * 60;
}

function clearTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
  }

  state.timerEndsAt = null;
  state.timerInterval = null;
}

function removeTimer() {
  clearTimer();
  state.selectedTimerHours = 0;
  state.selectedTimerMinutes = 0;
  setTimerDuration();
  renderTimer();
}

function renderTimer() {
  let timerText = formatTimerSelection(state.timerDurationSeconds);

  if (state.timerEndsAt) {
    const remainingSeconds = Math.max(0, Math.ceil((state.timerEndsAt - Date.now()) / 1000));
    timerText = formatTimer(remainingSeconds);
  }

  timerModal.querySelectorAll('[data-timer-minute]').forEach((button) => {
    const isSelected = Number(button.dataset.timerMinute) === state.selectedTimerMinutes;
    button.setAttribute('aria-pressed', String(isSelected));
  });

  timerStatuses.forEach((timerStatus) => {
    timerStatus.textContent = timerText;
  });
  timerTrigger.setAttribute('aria-label', `Timer ${timerText}`);

  timerModal.querySelectorAll('[data-timer-hour]').forEach((button) => {
    const isSelected = Number(button.dataset.timerHour) === state.selectedTimerHours;
    button.setAttribute('aria-pressed', String(isSelected));
  });
}

function renderPlayerState() {
  trackSelectValue.textContent = getTrackLabel(state.selectedTrack);
  playButton.textContent = state.isPlaying ? 'Pause' : 'Play';
  playButton.setAttribute('aria-pressed', String(state.isPlaying));
  waveLoader.classList.toggle('is-playing', state.isPlaying);
  waveLoader.setAttribute('aria-label', state.isPlaying ? 'Audio playing' : 'Audio paused');

  trackDropdownMenu.querySelectorAll('.track-option').forEach((button) => {
    button.setAttribute('aria-selected', String(button.dataset.trackId === state.selectedTrack.id));
  });
}

function renderTrackDropdown() {
  trackDropdown.classList.toggle('is-open', state.isTrackMenuOpen);
  trackDropdownTrigger.setAttribute('aria-expanded', String(state.isTrackMenuOpen));
  trackDropdownMenu.hidden = !state.isTrackMenuOpen;
}

function createInfoIcon(track) {
  const icon = document.createElement('span');

  icon.className = 'track-info';
  icon.setAttribute('aria-label', track.description);
  icon.innerHTML = `<svg width="32" height="32" viewBox="0 -0.32 21.12 21.12" aria-hidden="true" focusable="false">
  <path d="M10.56 18.24q-2.16 0-4-1.08t-2.92-2.92-1.08-4 1.08-4 2.92-2.92 4-1.08 4 1.08 2.92 2.92 1.08 4-1.08 4-2.92 2.92-4 1.08m1.28-9.92V5.76H9.28v2.56zm0 6.4V9.6H9.28v5.12z"/>
</svg>`;

  return icon;
}

function createTrackTooltip(track) {
  const tooltip = document.createElement('span');
  const text = document.createElement('span');

  tooltip.className = 'track-tooltip';
  tooltip.role = 'tooltip';
  text.className = 'track-tooltip-text';
  text.textContent = track.description;
  tooltip.append(text);

  return tooltip;
}

function createHeadphoneBadge(track) {
  if (!track.headphoneOnly) {
    return null;
  }

  const badge = document.createElement('span');

  badge.className = 'track-badge';
  badge.textContent = 'Headphones';

  return badge;
}

function createFavoriteButton(track) {
  const button = document.createElement('button');
  const isFavorite = state.favoriteTracks.has(track.id);

  button.className = 'track-favorite';
  button.type = 'button';
  button.dataset.favoriteTrackId = track.id;
  button.setAttribute('aria-label', `${isFavorite ? 'Remove' : 'Add'} ${track.name} favorite`);
  button.setAttribute('aria-pressed', String(isFavorite));
  button.innerHTML = `<svg width="32" height="32" viewBox="0 -0.04 0.8 0.8" aria-hidden="true" focusable="false">
  <path class="track-favorite-fill" d="M.4.04.289.251.04.284l.18.164L.178.68.4.571.622.68.58.448.76.284.511.25Z"/>
  <path class="track-favorite-stroke" d="M.4.04.289.251.04.284l.18.164L.178.68.4.571.622.68.58.448.76.284.511.25Z" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width=".08"/>
</svg>`;

  return button;
}

function createTrackOption(track) {
  const option = document.createElement('div');
  const button = document.createElement('button');
  const name = document.createElement('span');
  const text = document.createElement('span');

  option.className = 'track-option';
  option.role = 'option';
  option.dataset.trackId = track.id;
  option.setAttribute('aria-selected', String(track.id === state.selectedTrack.id));

  button.className = 'track-select-button';
  button.type = 'button';
  button.dataset.trackId = track.id;

  name.className = 'track-name';
  text.textContent = track.name;
  name.append(text);

  const headphoneBadge = createHeadphoneBadge(track);
  if (headphoneBadge) {
    name.append(headphoneBadge);
  }

  button.append(name, createInfoIcon(track), createTrackTooltip(track));
  option.append(button, createFavoriteButton(track));

  return option;
}

function createTrackGroupLabel(text) {
  const label = document.createElement('div');

  label.className = 'track-group-label';
  label.textContent = text;

  return label;
}

function createTrackDivider(text) {
  const divider = document.createElement('div');

  divider.className = 'track-divider';
  divider.role = 'separator';
  divider.textContent = text;

  return divider;
}

function renderTrackOptions() {
  const favoriteTracks = CONFIG.tracks
    .filter((track) => state.favoriteTracks.has(track.id))
    .sort((firstTrack, secondTrack) => {
      if (firstTrack.id === CONFIG.defaultTrackId) {
        return -1;
      }

      if (secondTrack.id === CONFIG.defaultTrackId) {
        return 1;
      }

      return state.favoriteTracks.get(secondTrack.id) - state.favoriteTracks.get(firstTrack.id);
    });
  const popularTracks = CONFIG.tracks.filter(
    (track) => track.popular && !state.favoriteTracks.has(track.id),
  );
  const regularTracks = CONFIG.tracks.filter(
    (track) => !track.popular && !state.favoriteTracks.has(track.id),
  );
  const options = [];

  if (favoriteTracks.length) {
    options.push(createTrackGroupLabel('Favorites'), ...favoriteTracks.map(createTrackOption));
  }

  if (popularTracks.length) {
    options.push(createTrackDivider('Top Picks'), ...popularTracks.map(createTrackOption));
  }

  if ((favoriteTracks.length || popularTracks.length) && regularTracks.length) {
    options.push(createTrackDivider('All tracks'));
  }

  options.push(...regularTracks.map(createTrackOption));

  trackDropdownMenu.replaceChildren(...options);

  renderTrackDropdown();
}

function startTimer() {
  clearTimer();

  if (!state.timerDurationSeconds) {
    renderTimer();
    return;
  }

  state.timerEndsAt = Date.now() + state.timerDurationSeconds * 1000;
  state.timerInterval = setInterval(() => {
    if (Date.now() >= state.timerEndsAt) {
      stopAudio();
      return;
    }

    renderTimer();
  }, 1000);

  renderTimer();
}

async function startAudio() {
  await engine.playTrack(state.selectedTrack);
  engine.setMasterVolume(state.volume);
  state.isPlaying = true;
  startTimer();
  renderPlayerState();
}

function stopAudio() {
  clearTimer();
  renderTimer();
  engine.stopCurrentTrack();
  state.isPlaying = false;
  renderPlayerState();
}

playButton.addEventListener('click', async () => {
  if (state.isPlaying) {
    stopAudio();
    return;
  }

  await startAudio();
});

volumeInput.addEventListener('input', (event) => {
  state.volume = Number(event.target.value);
  renderVolumeProgress();

  if (state.isPlaying) {
    engine.setMasterVolume(state.volume);
  }
});

themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  renderTheme();
});

moreButton.addEventListener('click', () => {
  projectModal.showModal();
});

projectModalClose.addEventListener('click', () => {
  projectModal.close();
});

projectModalShare.addEventListener('click', async () => {
  const shareData = {
    title: 'Lofre',
    text: 'A tiny free offline meditation tool.',
    url: window.location.href,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await navigator.clipboard.writeText(shareData.url);
    projectModalShare.textContent = 'Link copied';
    resetProjectShareLabel();
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }

    projectModalShare.textContent = 'Share unavailable';
    resetProjectShareLabel();
  }
});

projectModalInstall.addEventListener('click', async () => {
  if (!deferredInstallPrompt) {
    return;
  }

  deferredInstallPrompt.prompt();

  const choice = await deferredInstallPrompt.userChoice;
  if (choice.outcome === 'accepted') {
    deferredInstallPrompt = null;
  }

  renderInstallAction();
});

projectModal.addEventListener('click', (event) => {
  if (event.target === projectModal) {
    projectModal.close();
  }
});

timerTrigger.addEventListener('click', () => {
  timerModal.showModal();
});

timerModalClose.addEventListener('click', () => {
  timerModal.close();
});

timerModalClear.addEventListener('click', () => {
  removeTimer();
});

timerModal.addEventListener('click', (event) => {
  if (event.target === timerModal) {
    timerModal.close();
    return;
  }

  const minuteButton = event.target.closest('[data-timer-minute]');
  const hourButton = event.target.closest('[data-timer-hour]');

  if (!minuteButton && !hourButton) {
    return;
  }

  if (minuteButton) {
    state.selectedTimerMinutes = Number(minuteButton.dataset.timerMinute);
  }

  if (hourButton) {
    const selectedHour = Number(hourButton.dataset.timerHour);
    state.selectedTimerHours = state.selectedTimerHours === selectedHour ? 0 : selectedHour;
  }

  setTimerDuration();

  if (state.isPlaying) {
    startTimer();
    return;
  }

  renderTimer();
});

trackDropdownTrigger.addEventListener('click', () => {
  state.isTrackMenuOpen = !state.isTrackMenuOpen;
  renderTrackDropdown();
});

trackDropdownMenu.addEventListener('click', async (event) => {
  const favoriteButton = event.target.closest('[data-favorite-track-id]');

  if (favoriteButton) {
    event.stopPropagation();

    const trackId = favoriteButton.dataset.favoriteTrackId;

    if (state.favoriteTracks.has(trackId)) {
      state.favoriteTracks.delete(trackId);
    } else {
      state.favoriteTracks.set(trackId, Date.now());
    }

    saveFavoriteTracks();
    renderTrackOptions();
    renderPlayerState();
    return;
  }

  const info = event.target.closest('.track-info');

  if (info) {
    event.stopPropagation();
    info.closest('.track-option')?.classList.toggle('is-tooltip-open');
    return;
  }

  const button = event.target.closest('.track-select-button');

  if (!button) {
    return;
  }

  const selectedTrack = CONFIG.tracks.find((track) => track.id === button.dataset.trackId);

  if (!selectedTrack) {
    return;
  }

  state.selectedTrack = selectedTrack;
  state.isTrackMenuOpen = false;

  if (state.isPlaying) {
    await engine.playTrack(state.selectedTrack);
    engine.setMasterVolume(state.volume);
  }

  renderTrackDropdown();
  renderPlayerState();
});

trackDropdownMenu.addEventListener('pointerover', (event) => {
  const info = event.target.closest('.track-info');

  if (!info) {
    return;
  }

  info.closest('.track-option')?.classList.add('is-tooltip-open');
});

trackDropdownMenu.addEventListener('pointerout', (event) => {
  const option = event.target.closest('.track-option');

  if (!option || option.contains(event.relatedTarget)) {
    return;
  }

  option.classList.remove('is-tooltip-open');
});

document.addEventListener('click', (event) => {
  if (!state.isTrackMenuOpen || trackDropdown.contains(event.target)) {
    return;
  }

  state.isTrackMenuOpen = false;
  renderTrackDropdown();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !state.isTrackMenuOpen) {
    return;
  }

  state.isTrackMenuOpen = false;
  renderTrackDropdown();
  trackDropdownTrigger.focus();
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  renderInstallAction();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  renderInstallAction();
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

renderTheme();
renderInstallAction();
renderTimer();
renderTrackOptions();
renderPlayerState();
