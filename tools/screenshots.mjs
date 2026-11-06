#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { preview } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'screenshots');
fs.mkdirSync(outDir, { recursive: true });

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

async function main() {
  console.log('Starting Vite preview server...');
  const server = await preview({
    root: rootDir,
    preview: { port: PORT, strictPort: true },
  });

  const consoleErrors = [];
  const pageErrors = [];
  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.CHROME_PATH ?? (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--enable-webgl',
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    console.log(`Navigating to ${BASE_URL} ...`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForFunction(
      () => Boolean(window.__ESP32_APP__ && window.__ESP32_APP__.ready),
      null,
      { timeout: 30000 }
    );
    await page.waitForTimeout(500);

    // 1. Overview
    console.log('Capturing overview.png ...');
    await page.screenshot({ path: path.join(outDir, 'overview.png') });

    // 2. Top view
    console.log('Capturing top.png ...');
    await page.evaluate(() => window.__ESP32_APP__.setCameraPreset('top', true));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, 'top.png') });

    // 3. Bottom view
    console.log('Capturing bottom.png ...');
    await page.evaluate(() => window.__ESP32_APP__.setCameraPreset('bottom', true));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, 'bottom.png') });

    // 4. Type-C view preset
    console.log('Capturing preset-typec.png ...');
    await page.evaluate(() => window.__ESP32_APP__.setCameraPreset('type_c', true));
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, 'preset-typec.png') });

    // 5. Selected ESP-WROOM-32
    console.log('Capturing selected-esp32.png ...');
    await page.evaluate(() => window.__ESP32_APP__.selectComponent('esp_wroom_32', true));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, 'selected-esp32.png') });

    // 6. Selected MIFA Antenna
    console.log('Capturing selected-antenna.png ...');
    await page.evaluate(() => window.__ESP32_APP__.selectComponent('antenna_pcb', true));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, 'selected-antenna.png') });

    // 7. Selected CP2102
    console.log('Capturing selected-cp2102.png ...');
    await page.evaluate(() => window.__ESP32_APP__.selectComponent('cp2102', true));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, 'selected-cp2102.png') });

    // 8. Selected AMS1117-3.3
    console.log('Capturing selected-ams1117.png ...');
    await page.evaluate(() => window.__ESP32_APP__.selectComponent('ams1117', true));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, 'selected-ams1117.png') });

    // 9. Selected USB Type-C
    console.log('Capturing selected-typec.png ...');
    await page.evaluate(() => window.__ESP32_APP__.selectComponent('usb_type_c', true));
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(outDir, 'selected-typec.png') });

    // 10. Drawer Open
    console.log('Capturing drawer-open.png ...');
    await page.evaluate(() => window.__ESP32_APP__.selectComponent('board', true));
    await page.waitForTimeout(300);
    await page.click('[data-action="drawer"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, 'drawer-open.png') });
    await page.click('.drawer-close-btn');
    await page.waitForTimeout(200);

    // 11. Tutorial Active
    console.log('Capturing tutorial-active.png ...');
    await page.click('[data-action="tutorial"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, 'tutorial-active.png') });
    await page.click('.tutorial-close-btn');
    await page.waitForTimeout(200);

    // 12. GPIO Modal
    console.log('Capturing gpio-modal.png ...');
    const masterFig = page.locator('.gpio-master-figure');
    if (await masterFig.count()) {
      await masterFig.scrollIntoViewIfNeeded();
      await masterFig.click();
      await page.waitForSelector('#image-lightbox-modal:not(.hidden)', { timeout: 3000 });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, 'gpio-modal.png') });
      await page.keyboard.press('Escape');
    }

    console.log(`\n🎉 Verification screenshots captured successfully into: ${outDir}\n`);

    if (consoleErrors.length > 0) {
      console.warn('⚠️ Console errors during run:', consoleErrors);
    }
    if (pageErrors.length > 0) {
      console.error('❌ Page runtime errors:', pageErrors);
      process.exitCode = 1;
    }
  } finally {
    if (browser) await browser.close();
    server.httpServer.close();
  }
}

main().catch((err) => {
  console.error('Fatal error during screenshots execution:', err);
  process.exit(1);
});
