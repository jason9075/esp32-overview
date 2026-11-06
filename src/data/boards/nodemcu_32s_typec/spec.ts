import { BoardMechanicalSpec } from '../types';

export const BOARD_SPEC: BoardMechanicalSpec = {
  id: 'nodemcu_32s_typec',
  modelName: 'ESP32 NodeMCU-32S (38-Pin Type-C)',
  taglineZh: '樂鑫 ESP-WROOM-32 雙核 Wi-Fi/藍牙物聯網開發板（Type-C / 38-Pin）',
  revisionYear: 2022,
  widthMm: 51.5,
  depthMm: 28.5,
  thicknessMm: 1.6,
  cornerRadiusMm: 1.0,
  mountingHoleSpacingXMm: 45.0,
  mountingHoleSpacingZMm: 22.0,
  mountingHoleDrillMm: 3.0,
  // Board centered at (0, 0, 0) in Three.js:
  // X spans [-25.75, +25.75] mm; Z spans [-14.25, +14.25] mm.
  // 4 corner M3 mounting holes are located at (±22.5, ±11.0) mm.
  mountingHoles: [
    { id: 'mh_tl', label: 'M3 固定孔 (左上 / 3V3 端)', xMm: -22.5, zMm: -11.0, drillDiameterMm: 3.0, padDiameterMm: 5.5 },
    { id: 'mh_tr', label: 'M3 固定孔 (右上 / 天線端)', xMm: 22.5, zMm: -11.0, drillDiameterMm: 3.0, padDiameterMm: 5.5 },
    { id: 'mh_bl', label: 'M3 固定孔 (左下 / GND 端)', xMm: -22.5, zMm: 11.0, drillDiameterMm: 3.0, padDiameterMm: 5.5 },
    { id: 'mh_br', label: 'M3 固定孔 (右下 / 天線端)', xMm: 22.5, zMm: 11.0, drillDiameterMm: 3.0, padDiameterMm: 5.5 },
  ],
  glbAssetPath: 'assets/esp32_nodemcu_32s_typec.glb',
  sourceUrl: 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32/hw-reference/esp32/get-started-devkitc.html',
  officialProductUrl: 'https://www.espressif.com/en/products/socs/esp32',
  officialSchematicsUrl: 'https://dl.espressif.com/dl/schematics/esp32_devkitc_v4-sch-20180607a.pdf',
  officialDatasheetUrl: 'https://www.espressif.com/sites/default/files/documentation/esp-wroom-32_datasheet_en.pdf',
  keyHighlightsZh: [
    '樂鑫 ESP-WROOM-32 模組，搭載 ESP32-D0WDQ6 雙核心 Xtensa LX6 處理器 @ 240MHz',
    '內建 448 KB ROM、520 KB SRAM 與 4MB (32Mbit) 高速 QSPI Flash',
    '整合 2.4 GHz 802.11 b/g/n Wi-Fi 與 Bluetooth 4.2 BR/EDR / BLE 雙模射頻',
    '升級 USB Type-C 正反雙面插拔連接埠，支援 5V 快速供電與高可靠通訊',
    'Silicon Labs CP2102 高效能 USB-to-UART 橋接晶片，最高支援 12 Mbps 傳輸',
    'AMS1117-3.3 高效率線性穩壓器（LDO），提供穩定 3.3V 800mA 系統核心供電',
    'DTR / RTS 雙電晶體自動重設與燒錄電路，上傳韌體無需手動按壓開關',
    '相容標準麵包板的 38-Pin 雙排針（22.86 mm 排距 / 2.54 mm 間距）',
  ],
};
