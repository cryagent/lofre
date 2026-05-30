# Repository Guidelines

## Project Structure & Module Organization

This is a small Bun-powered Vite frontend app. Runtime source lives in `src/`.
`src/main.js` owns UI state, DOM wiring, timer behavior, theme handling, and app
initialization. Shared styling is in `src/style.css`. Audio code is grouped under
`src/audio/`: `engine.js` creates and controls playback, `tracks.js` defines the
available track metadata, and `src/audio/generators/` contains individual Web
Audio generator modules plus shared helpers. Static PWA assets live in `public/`.
`dist/` is generated build output; do not edit it by hand.

## Build, Test, and Development Commands

Use Bun for package scripts:

- `bun run dev` starts the local Vite development server.
- `bun run build` creates the production build in `dist/`.
- `bun run preview` serves the built app locally for smoke testing.
- `bun run format` formats the repository with `oxfmt`.
- `bun run format:check` verifies formatting without writing changes.
- `bun run lint` runs `oxlint` against `src`.
- `bun run check` runs format check, lint, and build; use this before submitting changes.

## Coding Style & Naming Conventions

The project uses ES modules (`"type": "module"`). Follow the existing JavaScript
style: two-space indentation, semicolons, `const` by default, and descriptive
camelCase names for variables and functions. Audio generator files use
lowerCamelCase filenames such as `binauralBeat.js` and should export focused
generator functions. Keep browser-facing constants grouped near the top of a
module when they define app behavior.

## Testing Guidelines

There is currently no dedicated test framework or `test` script. For changes,
run `bun run check` and manually verify the affected flow in the browser. For
audio work, confirm playback starts and stops cleanly, volume changes apply, and
track switching does not leave stale oscillators or timers running. If tests are
added later, prefer colocated `*.test.js` files or a top-level `tests/` directory,
and document the new command in `package.json`.

## Commit & Pull Request Guidelines

Git history is minimal and uses short, imperative commit subjects such as
`Initial commit` and `output`. Keep future subjects concise and action-oriented,
for example `Add sleep timer controls` or `Refine noise generator envelope`.
Pull requests should include a short summary, commands run (especially
`bun run check`), linked issues when available, and screenshots or recordings for
visible UI changes.

## Security & Configuration Tips

Do not commit secrets or local environment files. Treat `public/sw.js`,
`public/site.webmanifest`, and generated `dist/` assets carefully because stale
PWA files can affect install and caching behavior.
