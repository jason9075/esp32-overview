# AGENTS.md — ESP32 NodeMCU-32S (38-Pin Type-C) 3D Interactive Hardware Explorer

## Project Overview
This repository implements an interactive 3D hardware architecture explorer for the **ESP32 NodeMCU-32S 38-Pin Type-C development board**, modeled after `../rpi3_overview` and `../fc_overview`. It renders a multi-material, component-indexed `.glb` model (`public/assets/esp32_nodemcu_32s_typec.glb`) with Traditional Chinese hardware descriptions, 38-Pin GPIO pinout diagrams, subcircuit annotations, and interactive tutorials.

## Key Commands
- `npm run dev`: Start Vite dev server on port 5173.
- `npm run typecheck`: Run `tsc --noEmit`.
- `npm run build`: Typecheck and build production bundle to `dist/`.
- `npm run preview`: Serve `dist/` on port 4173.
- `npm run check:hardware`: Verify `.glb` headers, PCB mechanical dimensions (`51.5 × 28.5 × 1.6 mm`), and named GLB nodes against `modelPlacements.json`.
- `npm run generate:model`: Generate the 3D `.glb` model and `modelPlacements.json` via headless Blender script.
- `npm run generate:svg`: Generate `gpio_pinout_diagram.svg` and individual pin SVGs.
- `npm run screenshots`: Launch headless Chrome via Playwright against `vite preview` (port 4173) and capture verification screenshots into `screenshots/`.
- `just verify`: Run the complete verification pipeline (`typecheck` → `build` → `check-hardware` → `screenshots`).

## Architecture & Conventions
- **Coordinate System (Three.js Y-up, `1 unit = 1 mm`, board centered at origin `(0, 0, 0)`)**:
  - `X` (`[-25.75, +25.75] mm`): Left (`-X`) = USB Type-C connector, EN / BOOT buttons, CP2102, AMS1117-3.3; Right (`+X`) = ESP-WROOM-32 module and 2.4 GHz PCB trace antenna.
  - `Y`: Board normal (`+Y` = Top face, `-Y` = Bottom face; PCB substrate spans `[-0.80, +0.80] mm` with 1.6 mm thickness).
  - `Z` (`[-14.25, +14.25] mm`): `-Z` = Left Pin Header row (Pins 1..19, 3V3 to 5V/VIN at `Z = -11.43 mm`); `+Z` = Right Pin Header row (Pins 20..38, GND to GND at `Z = +11.43 mm`).
  - Pin Pitch: `2.54 mm` (100 mil); Row Spacing: `22.86 mm` (0.9 inch / 900 mil, standard breadboard spacing).
- **Board Package Modularity (`src/data/boards/`)**:
  - NodeMCU-32S Type-C package provided in `src/data/boards/nodemcu_32s_typec/` (`spec.ts`, `components.ts`, `placement.ts`, `gpioPins.ts`, `modelPlacements.json`, and `tutorialSteps`).
  - Registered via `src/data/boards/registry.ts`.
- **Code Style**:
  - 2 spaces indentation, single quotes, semicolons, strict TypeScript.
  - All user-facing UI copy and hardware descriptions in `src/data/boards/`, `src/ui/`, and `index.html` use Traditional Chinese (`zh-Hant` / Taiwan terminology).
  - Data-driven strings rendered via `escapeHtml()`.
