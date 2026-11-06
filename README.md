# ESP32 NodeMCU-32S (38-Pin Type-C) Interactive 3D Hardware Explorer

An interactive 3D explorer for the ESP32 NodeMCU-32S development board (38-pin, USB Type-C version), built with **Three.js + TypeScript + Vite**. It includes a millimeter-accurate 3D model and click-to-focus on every component, front and back. It also has in-depth hardware notes, a full 38-pin GPIO pinout and a guided tutorial. The in-app copy is in Traditional Chinese.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-0.174-green.svg)

---

## 🌟 Features

1. **Realistic 3D geometry**
   - Modeled from the real board and from photos of it: `51.5 × 28.5 × 1.6 mm`, two 19-pin headers at 2.54 mm pitch, and 0.9" row spacing that fits a standard breadboard.
   - Includes the USB Type-C receptacle, the ESP-32 module with its RF shield, and the module's 2.4 GHz PCB antenna. Also the Silicon Labs CP2102 USB-to-UART bridge, the AMS1117-3.3 LDO and the two-transistor auto-reset circuit. Plus the EN / IO0 buttons, the status LEDs, and silkscreen on both sides with pin labels.
   - The RF shield is textured with a perspective-corrected photo of the real module.
2. **Fast BVH picking and PBR shading**
   - Uses a `three-mesh-bvh` acceleration tree for fast click picking.
   - PBR materials with ACES Filmic tone mapping show the metal shield, gloss-black solder mask and tinned joints.
3. **In-depth hardware notes (Traditional Chinese)**
   - Covers the ESP32-D0WDQ6 dual-core Xtensa LX6 SoC, the 4 MB QSPI flash, the 40 MHz crystal and the RF matching network.
   - Explains the Type-C CC1 / CC2 5.1 kΩ pull-downs, the DTR/RTS auto-reset circuit and the AMS1117 power filtering.
4. **Full 38-pin GPIO pinout with 3D markers**
   - An interactive pin table. You can filter it by power, I²C, UART, SPI, ADC/Touch, DAC and GPIO.
   - Click any pin to highlight where it physically sits on the 3D header. You also get its electrical notes, such as strapping-pin limits and input-only pins.
5. **Step-by-step interactive tutorial**
   - Walks beginners through the board's processor, antenna, interfaces and power design.

---

## 🚀 Getting Started

### Install dependencies
```bash
npm install
```

### Start the dev server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Build for production
```bash
npm run build
npm run preview
```

### Validate the hardware model and geometry
```bash
npm run check:hardware
```

### Run the end-to-end screenshot check
```bash
npm run build
npm run screenshots
```
Screenshots are written to `screenshots/`. Set `CHROME_PATH` to choose the browser.

### Regenerate assets
```bash
npm run generate:model   # Blender (headless): GLB + modelPlacements.json
npm run generate:svg     # GPIO pinout SVGs
python3 tools/make_shield_texture.py <top_photo.jpg>   # RF shield texture
```

---

## 📐 Coordinate System

Three.js Y-up, 1 unit = 1 mm, with the board centered at the origin `(0, 0, 0)`:

- `X` (`[-25.75, +25.75] mm`): `-X` is the USB Type-C end with the buttons. `+X` is the ESP-32 module and antenna end.
- `Y`: the board normal. `+Y` is the component side and `-Y` the bottom side. The PCB spans `[-0.8, +0.8] mm`, 1.6 mm thick.
- `Z` (`[-14.25, +14.25] mm`): `-Z` is the left 19-pin header (pins 1–19, at `Z = -11.43 mm`). `+Z` is the right 19-pin header (pins 20–38, at `Z = +11.43 mm`).
  - Pin 1 (3V3) and pin 20 (GND) sit at the antenna end (`X = +22.86 mm`).

---

## 🛠️ Tech Stack

- **Rendering**: [Three.js](https://threejs.org/) + [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh)
- **Language**: TypeScript 5.7 (strict mode) with plain DOM components
- **Build tool**: [Vite](https://vitejs.dev/)
- **End-to-end checks**: [Playwright](https://playwright.dev/)
- **3D model generation**: Blender Python script
- **Deployment**: GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`, runs on every push to `main`)

---

## 📄 License

MIT License
