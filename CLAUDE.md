# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

`AGENTS.md` carries an overlapping subset of this guidance for other agents — keep the two in sync when changing conventions.

## Project

Interactive 3D hardware explorer for the **ESP32 NodeMCU-32S (38-Pin Type-C)** development board, built with vanilla **TypeScript + Three.js + Vite** (no UI framework). It renders a component-indexed GLB model (`public/assets/esp32_nodemcu_32s_typec.glb`) with Traditional Chinese hardware descriptions, 38-Pin GPIO pinouts, subcircuit diagrams, and step-by-step interactive tutorials. Sister projects: `../rpi3_overview` and `../fc_overview`.

Deployed as a static site to **GitHub Pages** via `.github/workflows/deploy.yml` (push to `main` → `npm ci` → `check:hardware` → `build` → upload `dist/`). Only `main` deploys; GitHub Pages must be set to source "GitHub Actions".

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

There is no unit-test framework. `npm run screenshots` is the end-to-end check: it serves the **built** `dist/` (run `npm run build` first), drives the app through `window.__ESP32_APP__` (`setCameraPreset`, `selectComponent`, …), and exits non-zero on page runtime errors (console errors only warn). Set `CHROME_PATH` to override the browser; it falls back to `/usr/bin/google-chrome`, then Playwright's bundled Chromium.

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

### Generated artifacts and duplicated data

- `tools/generate_board_model.py` (Blender) writes **both** the GLB and `src/data/boards/nodemcu_32s_typec/modelPlacements.json` (per-mesh bbox/center/size). Don't hand-edit either; change the script and regenerate. Geometry is authored directly in the app's Y-up frame and exported with `export_yup=False` — removing that flag stands the board on its edge. Silkscreen/markings are Blender text meshes joined into their parent component mesh (e.g. silkscreen into `pcb`).
- The RF-shield artwork is a real photo: `tools/make_shield_texture.py <photo>` perspective-corrects it into `tools/textures/shield_top.jpg` (committed; corner coordinates are hard-coded for that photo), which the Blender script embeds in the GLB.
- `placement.ts` maps mesh names → components via `MESH_TO_COMPONENT`; unmapped meshes silently fall back to `componentId: 'board'`. Adding or renaming a mesh in the Blender script requires a matching entry there. Every mesh also becomes a `SYNTHETIC_ZONES` entry.
- `tools/check-hardware-model.mjs` hard-codes its expectations in a `BOARD` constant (GLB filename, placements path, `expectedMeshes: 14` minimum, dimensions); update it when the mesh set or board changes.
- 38-pin data exists twice: `nodemcu_32s_typec/gpioPins.ts` (app) and the `PINS` list in `tools/generate_gpio_svg.py` (generates `public/assets/gpio_pinout_diagram.svg` and `gpio_pins/pin_01..38.svg`). Edit both together, then run `npm run generate:svg`.
- Tutorial steps live inline in `src/data/boards/registry.ts` (`tutorialSteps`), referencing `componentId`s from `components.ts`.
- `src/data/{boardSpec,components,gpioPins,placement}.ts` are one-line re-export shims of the NodeMCU package; new code should go through `getBoardPackage()` / the `BoardPackage` object instead.

## Conventions

- **Coordinates** (Three.js Y-up, `1 unit = 1 mm`, board centered at origin):
  - `X ∈ [-25.75, 25.75]`: `-X` = USB Type-C / EN & BOOT buttons / CP2102 / AMS1117; `+X` = ESP-WROOM-32 & PCB antenna.
  - `Y`: board normal; PCB substrate spans `[-0.8, 0.8]`; `+Y` top face, `-Y` bottom face.
  - `Z ∈ [-14.25, 14.25]`: `-Z` = Left Pin Header (Pins 1..19 at `Z = -11.43`); `+Z` = Right Pin Header (Pins 20..38 at `Z = +11.43`).
  - Pin pitch `2.54 mm`; row spacing `22.86 mm` (0.9"). Pin index 0 of each row (3V3 / GND) is at the antenna end, `X = +22.86`.
- **Code style**: 2-space indent, single quotes, semicolons, strict TS, camelCase files/functions, PascalCase types, UPPER_CASE shared constants.
- **Language**: all user-facing copy (`index.html`, `src/ui/`, `src/data/boards/`) is Traditional Chinese (Taiwan terminology). Code comments in English.
- **HTML templating**: UI is built with template literals + `innerHTML`. Every data-driven value **must** go through `escapeHtml()`.
- **Asset paths**: use `assetUrl('assets/...')` (relative to Vite `base: './'`), never a leading `/`.
