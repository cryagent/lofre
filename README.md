# Lofre

Lofre is a small offline meditation app built with Bun, Vite, and the Web Audio API.
It generates meditation and focus tracks in the browser instead of streaming audio.

Website: https://lofre.app

## Features

- Algorithmic audio tracks for focus, relaxation, sleep, study, and downshifting
- Play/pause control, volume control, and sleep timer
- Favorite tracks stored locally in the browser
- Light and dark themes
- PWA assets for offline use and installable app behavior

## Requirements

- [Bun](https://bun.sh/)

## Getting Started

Install dependencies:

```sh
bun install
```

Start the development server:

```sh
bun run dev
```

Build for production:

```sh
bun run build
```

Preview the production build:

```sh
bun run preview
```

## Scripts

- `bun run dev` starts the Vite development server.
- `bun run build` creates the production build in `dist/`.
- `bun run preview` serves the built app locally.
- `bun run format` formats the repository with `oxfmt`.
- `bun run lint` runs `oxlint` against `src`.
- `bun run check` runs formatting checks, linting, and the production build.

## Project Structure

```text
src/
  main.js              App state, DOM wiring, timer behavior, and initialization
  style.css            Shared UI styles
  audio/
    engine.js          Web Audio playback engine
    tracks.js          Track metadata
    generators/        Individual audio generator modules
public/                Static PWA assets
dist/                  Generated build output
```

## Notes

`dist/` is generated output. Edit files in `src/` and `public/`, then rebuild.
