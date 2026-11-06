import rawPlacements from './modelPlacements.json';
import { PlacementItem, SyntheticHighlightZone } from '../types';

export interface RawPlacementItem {
  meshName: string;
  side: 'top' | 'bottom' | 'both';
  vertexCount: number;
  polygonCount: number;
  bbox: {
    min: [number, number, number];
    max: [number, number, number];
  };
  center: [number, number, number];
  size: [number, number, number];
}

const MESH_TO_COMPONENT: Record<string, PlacementItem> = {
  pcb: {
    componentId: 'board',
    subLabel: 'FR-4 雙層電路板基板 (51.5 × 28.5 × 1.6 mm)',
    side: 'both',
    isPCB: true,
  },
  esp_wroom_32: {
    componentId: 'esp_wroom_32',
    subLabel: 'ESP-WROOM-32 模組 (ESP32-D0WDQ6 + 4MB Flash)',
    side: 'top',
  },
  antenna_pcb: {
    componentId: 'antenna_pcb',
    subLabel: '2.4 GHz 倒 F 型 (MIFA) 印刷天線',
    side: 'top',
  },
  usb_type_c: {
    componentId: 'usb_type_c',
    subLabel: 'USB Type-C 16-Pin 正反盲插母座',
    side: 'top',
  },
  cp2102: {
    componentId: 'cp2102',
    subLabel: 'Silicon Labs CP2102-GMR USB-UART 橋接器',
    side: 'top',
  },
  ams1117: {
    componentId: 'ams1117',
    subLabel: 'AMS1117-3.3 800mA 線性穩壓晶片 (LDO)',
    side: 'top',
  },
  btn_en: {
    componentId: 'btn_en',
    subLabel: 'EN 系統重設微動輕觸按鍵',
    side: 'top',
  },
  btn_boot: {
    componentId: 'btn_boot',
    subLabel: 'BOOT 開機模式選擇輕觸按鍵 (GPIO0)',
    side: 'top',
  },
  led_pwr: {
    componentId: 'led_pwr',
    subLabel: 'PWR 電源指示燈 (紅色 SMD 0603)',
    side: 'top',
  },
  led_io2: {
    componentId: 'led_io2',
    subLabel: 'IO2 使用者自定義指示燈 (藍色 SMD 0603)',
    side: 'top',
  },
  transistor_auto_boot: {
    componentId: 'transistor_auto_boot',
    subLabel: 'DTR/RTS 雙電晶體自動下載電路 (SOT-23)',
    side: 'top',
  },
  passives: {
    componentId: 'passives',
    subLabel: '10µF 鉭質電容 / 陶瓷電容 / 蕭特基二極體群',
    side: 'top',
  },
  pin_headers_left: {
    componentId: 'pin_headers_left',
    subLabel: '左側 19-Pin 擴充排針 (3V3, EN, ADC1, DAC, VIN)',
    side: 'both',
  },
  pin_headers_right: {
    componentId: 'pin_headers_right',
    subLabel: '右側 19-Pin 擴充排針 (GND, VSPI, I2C, UART, Touch)',
    side: 'both',
  },
};

export const MESH_PLACEMENTS: Record<string, PlacementItem> = {};
export const SYNTHETIC_ZONES: SyntheticHighlightZone[] = [];

for (const raw of rawPlacements as RawPlacementItem[]) {
  const mapping = MESH_TO_COMPONENT[raw.meshName] ?? {
    componentId: 'board',
    subLabel: raw.meshName,
    side: raw.side,
  };

  MESH_PLACEMENTS[raw.meshName] = mapping;

  SYNTHETIC_ZONES.push({
    key: raw.meshName,
    componentId: mapping.componentId,
    subLabel: mapping.subLabel ?? raw.meshName,
    side: mapping.side,
    center: raw.center,
    size: raw.size,
  });
}
