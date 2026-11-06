# Justfile for ESP32 NodeMCU-32S 38-Pin Type-C Hardware Explorer

default:
  @just --list

# Install npm dependencies
install:
  npm install

# Start Vite development server
dev:
  npm run dev

# Run TypeScript type check
typecheck:
  npm run typecheck

# Build production bundle to dist/
build:
  npm run build

# Preview production build locally
preview:
  npm run preview

# Generate 3D hardware model using Blender
generate-model:
  blender --background --python tools/generate_board_model.py

# Generate SVG GPIO diagrams
generate-svg:
  python3 tools/generate_gpio_svg.py

# Validate GLB hardware model geometry and node metadata
check-hardware:
  npm run check:hardware

# Capture headless verification screenshots via Playwright
screenshots:
  npm run screenshots

# Complete verification pipeline
verify: typecheck build check-hardware screenshots
