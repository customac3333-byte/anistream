# Static Projects Hub

A polished collection of browser-based frontend experiments built with HTML, CSS, and vanilla JavaScript.

<p align="center">
  <img src="https://img.shields.io/badge/Status-Active-success" alt="Status Active" />
  <img src="https://img.shields.io/badge/Stack-HTML%20%7C%20CSS%20%7C%20JS-4a90e2" alt="Stack HTML CSS JS" />
  <img src="https://img.shields.io/badge/Mode-Static%20Frontend-ff6b6b" alt="Mode Static Frontend" />
</p>

## Overview

This repository hosts a creative showcase of modular web projects in a single static hub. Each project is designed to run directly in the browser with no backend setup required.

The hub includes:

- A bold landing page for browsing all experiments
- A growing set of interactive browser apps
- A free anime discovery and watch experience called AniStream Free
- A lightweight local-first workflow for quick experimentation

## Featured Project

### AniStream Free

AniStream Free is a browser-only anime discovery app built around:

- AniList metadata for anime data
- Search, trending, favorites, and continue watching
- Episode playback flow with browser-friendly player UI
- No API key or server-side backend required

> Note: Streaming availability depends on external public video providers and browser embed restrictions. The UI and watch workflow are fully client-side, but some episode sources may still be blocked by upstream providers.

## Project Structure

```text
static-projects-hub/
├── index.html
├── script.js
├── styles.html.css
└── projects/
    ├── anime-hub/
    ├── audio-visualizer/
    ├── coffee-roaster/
    ├── hls-player/
    ├── image-studio/
    ├── iptv-player/
    ├── kanban-board/
    ├── neo-brutalist/
    ├── retro-os/
    ├── space-timeline/
    └── video-editor/
```

## Run Locally

Because the projects are static files, you can open them directly in a browser, or serve the folder with a tiny local server.

### Option 1: Open directly

- Open [static-projects-hub/index.html](static-projects-hub/index.html) in your browser.

### Option 2: Run a local server

From the project root:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000/static-projects-hub/
```

## Highlights

- Fully static frontend architecture
- Responsive and polished visual design
- Interactive components using native browser APIs
- Easy to extend with more mini-projects

## Notes

This repository is intended as a creative frontend playground and showcase. The project is designed to be simple, portable, and easy to run without complex tooling.

## License

This repository is provided for educational and creative use.
