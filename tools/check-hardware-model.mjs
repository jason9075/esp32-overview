#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Hardware Model Check Failed: ${message}`);
    process.exit(1);
  }
}

const BOARD = {
  id: 'nodemcu_32s_typec',
  name: 'ESP32 NodeMCU-32S (38-Pin Type-C)',
  glbFile: 'esp32_nodemcu_32s_typec.glb',
  placementsFile: 'src/data/boards/nodemcu_32s_typec/modelPlacements.json',
  expectedMeshes: 14,
  expectedWidth: 51.5,
  expectedDepth: 28.5,
  expectedThicknessRange: [1.5, 1.7],
};

console.log('🔍 Checking hardware 3D models and metadata for ESP32 NodeMCU-32S Type-C...\n');

const glbPath = path.join(rootDir, 'public', 'assets', BOARD.glbFile);
assert(fs.existsSync(glbPath), `Missing GLB file at ${glbPath}`);

const glbStat = fs.statSync(glbPath);
assert(glbStat.size > 2000, `GLB file suspiciously small (${glbStat.size} bytes)`);

const fd = fs.openSync(glbPath, 'r');
const header = Buffer.alloc(12);
fs.readSync(fd, header, 0, 12, 0);

const magic = header.toString('utf8', 0, 4);
assert(magic === 'glTF', `Invalid GLB magic header: "${magic}" (expected "glTF")`);

const version = header.readUInt32LE(4);
assert(version === 2, `Unexpected GLTF version ${version} (expected 2)`);

const totalLength = header.readUInt32LE(8);
assert(totalLength === glbStat.size, `Header length ${totalLength} != file size ${glbStat.size}`);

// Read first chunk (JSON)
const chunk0Header = Buffer.alloc(8);
fs.readSync(fd, chunk0Header, 0, 8, 12);
const chunk0Length = chunk0Header.readUInt32LE(0);
const chunk0Type = chunk0Header.readUInt32LE(4);
assert(chunk0Type === 0x4e4f534a, `Chunk 0 is not JSON (type: 0x${chunk0Type.toString(16)})`);

const jsonBuf = Buffer.alloc(chunk0Length);
fs.readSync(fd, jsonBuf, 0, chunk0Length, 20);
fs.closeSync(fd);

const gltf = JSON.parse(jsonBuf.toString('utf8'));
const nodeNames = new Set((gltf.nodes || []).map((n) => n.name).filter(Boolean));
console.log(`✅ [${BOARD.id}] GLB binary valid: ${(glbStat.size / 1024).toFixed(1)} KB, ${nodeNames.size} nodes`);

// Verify placements JSON
const placementsPath = path.join(rootDir, BOARD.placementsFile);
assert(fs.existsSync(placementsPath), `Missing placements JSON at ${placementsPath}`);

const placements = JSON.parse(fs.readFileSync(placementsPath, 'utf8'));
assert(Array.isArray(placements), 'Placements must be an array');
assert(placements.length >= BOARD.expectedMeshes, `Expected at least ${BOARD.expectedMeshes} meshes, found ${placements.length}`);

// Verify named nodes match GLTF nodes
const pcbPlacement = placements.find((p) => p.meshName === 'pcb');
assert(Boolean(pcbPlacement), 'Missing "pcb" placement entry');

const [width, thickness, depth] = pcbPlacement.size;
const widthDiff = Math.abs(width - BOARD.expectedWidth);
const depthDiff = Math.abs(depth - BOARD.expectedDepth);
assert(widthDiff < 0.2, `PCB width ${width} mm deviates from expected ${BOARD.expectedWidth} mm`);
assert(depthDiff < 0.2, `PCB depth ${depth} mm deviates from expected ${BOARD.expectedDepth} mm`);
assert(
  thickness >= BOARD.expectedThicknessRange[0] && thickness <= BOARD.expectedThicknessRange[1],
  `PCB thickness ${thickness} mm outside expected [${BOARD.expectedThicknessRange.join(', ')}] mm`
);

console.log(`✅ [${BOARD.id}] PCB Dimensions: ${width.toFixed(2)} × ${depth.toFixed(2)} × ${thickness.toFixed(2)} mm`);

// Verify required hardware components exist
const requiredNodes = [
  'pcb',
  'esp_wroom_32',
  'antenna_pcb',
  'usb_type_c',
  'cp2102',
  'ams1117',
  'btn_en',
  'btn_boot',
  'led_pwr',
  'led_io2',
  'transistor_auto_boot',
  'pin_headers_left',
  'pin_headers_right',
];

for (const name of requiredNodes) {
  assert(nodeNames.has(name), `Required GLB node "${name}" not found in model`);
}

console.log(`✅ [${BOARD.id}] All ${requiredNodes.length} key hardware components confirmed in 3D GLB!`);
console.log('\n🎉 Hardware check passed successfully!\n');
