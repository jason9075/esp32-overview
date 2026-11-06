# CLAUDE.md

Guidance for AI coding agents working in this repository.

## Project

Interactive 3D hardware explorer for the **ESP32 NodeMCU-32S (38-Pin Type-C)** development board, built with vanilla **TypeScript + Three.js + Vite** (no UI framework). It renders a component-indexed GLB model (`public/assets/esp32_nodemcu_32s_typec.glb`) with Traditional Chinese hardware descriptions, 38-Pin GPIO pinouts, subcircuit diagrams, and step-by-step interactive tutorials. Sister projects: `../rpi3_overview` and `../fc_overview`.

Deployed as a static site to **GitHub Pages** via `.github/workflows/deploy.yml` (push to `main` → `npm ci` → `check:hardware` → `build` → upload `dist/`).

## Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Vite dev server at `http://localhost:5173` |
| `npm run typecheck` | `tsc --noEmit` (strict, incl. unused locals/params) |
| `npm run build` | Typecheck + production bundle in `dist/` |
| `npm run preview` | Serve `dist/` at port 4173 |
| `npm run check:hardware` | Validate GLB headers, node names vs `modelPlacements.json`, PCB `51.5 × 28.5 mm` dimensions |
| `npm run generate:model` | Run Blender headless script to generate `esp32_nodemcu_32s_typec.glb` |
| `npm run generate:svg` | Generate 38-pin GPIO pinout SVG charts and per-pin diagrams |
| `npm run screenshots` | Playwright UI flows against `vite preview` → `screenshots/` |
| `just verify` | `typecheck` → `build` → `check-hardware` → `screenshots` |

Minimum bar for any code change: `npm run build && npm run check:hardware`.

## Architecture

```
src/
  main.ts                 App bootstrap: wires scene, picking, highlight, UI callbacks; exposes window.__ESP32_APP__ test hook
  data/
    boards/
      types.ts            Universal interfaces (BoardPackage, BoardMechanicalSpec, ComponentEntry, GpioPinSpec)
      registry.ts         BOARD_PACKAGES registry map, DEFAULT_BOARD_ID, getBoardPackage()
      nodemcu_32s_typec/  NodeMCU-32S Type-C spec, components, placements, gpioPins, modelPlacements.json
  scene/
    setupScene.ts         Renderer, RoomEnvironment PMREM, two-sided lighting rig
    loadBoardModel.ts     GLTFLoader + MeshoptDecoder, BVH (three-mesh-bvh) per geometry, userData tagging, clean dispose()
    picking.ts            Single BVH raycast; nearest PCB hit occludes far-side parts; dynamic setInteractiveMeshes()
    highlight.ts          Per-component cloned materials, emissive hover/select, Box3Helper, GPIO pin marker, dispose()
    cameraControls.ts     ArcballControls + preset poses + eased focus transitions
  ui/                     toolbar, infoCard (incl. GPIO section + lightbox), componentDrawer, tutorial
  utils/html.ts           escapeHtml, assetUrl, hasActiveTextSelection
tools/                    Blender 3D generator script, GPIO SVG generator, hardware check, Playwright screenshots
public/assets/            GLB model (esp32_nodemcu_32s_typec.glb) + GPIO SVG diagrams
```

Data flow: `loadBoardModel(boardPkg)` → GLB node name → `boardPkg.placements[name]` → `componentId` → `boardPkg.componentMap[componentId]` (UI copy).

## Conventions

- **Coordinates** (Three.js Y-up, `1 unit = 1 mm`, board centered at origin):
  - `X ∈ [-25.75, 25.75]`: `-X` = USB Type-C / EN & BOOT buttons / CP2102 / AMS1117; `+X` = ESP-WROOM-32 & PCB antenna.
  - `Y`: board normal; PCB substrate spans `[-0.8, 0.8]`; `+Y` top face, `-Y` bottom face.
  - `Z ∈ [-14.25, 14.25]`: `-Z` = Left Pin Header (Pins 1..19 at `Z = -11.43`); `+Z` = Right Pin Header (Pins 20..38 at `Z = +11.43`).
- **Code style**: 2-space indent, single quotes, semicolons, strict TS, camelCase files/functions, PascalCase types, UPPER_CASE shared constants.
- **Language**: all user-facing copy (`index.html`, `src/ui/`, `src/data/boards/`) is Traditional Chinese (Taiwan terminology). Code comments in English.
- **HTML templating**: UI is built with template literals + `innerHTML`. Every data-driven value **must** go through `escapeHtml()`.
- **Asset paths**: use `assetUrl('assets/...')` (relative to Vite `base: './'`), never a leading `/`.
