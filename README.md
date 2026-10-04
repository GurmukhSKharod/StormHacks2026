# EscapeForge V3 — React + Express build

This is **the restored V3 game**, reorganized into a real frontend/backend app without changing the V3 lighting/look.

## Run on Windows

Double-click `RUN_GAME.bat`.

Or manually:

```bash
npm install
npm run build
npm start
```

Open `http://127.0.0.1:3001`.

For development with Vite HMR:

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Why this fixes the 3D assets

The browser no longer talks directly to FurniMesh / Google Storage. Three.js loads same-origin URLs such as `/api/assets/furni-armchair`.

Express downloads each allowed GLB, stores it in `server/cache/assets`, and serves that cached file from localhost. The first request needs internet; later runs use the local disk cache.

The large GLBs load *after* the V3 room is already playable, so a 10–20 MB furniture model cannot block the loading screen.

## Architecture

```text
client/
  index.html
  src/
    App.jsx            React UI shell
    api.js             frontend API fetch helpers
    styles.css         original V3 styling
    game/startGame.js  original V3 Three.js engine
server/
  index.js             Express API/static server
  assetCatalog.js      strict remote asset allow-list
  assetCache.js        server-side GLB download + disk cache
  cache/assets/        populated automatically
```

## Performance rules

- Rendering remains client-side Three.js/WebGL.
- React does not render each animation frame.
- Express only handles static files/API/GLB caching.
- V3 local texture enhancement remains; browser neural/ESRGAN inference is not used.
- Pixel ratio stays capped at 1.35.
- V3 shadow quality stays at the restored-fast 512 px settings.
- Remote GLBs stream after gameplay starts.
