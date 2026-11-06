import { BoardId, BoardPackage } from './types';
import { BOARD_SPEC } from './nodemcu_32s_typec/spec';
import { COMPONENTS, COMPONENT_MAP } from './nodemcu_32s_typec/components';
import { MESH_PLACEMENTS, SYNTHETIC_ZONES } from './nodemcu_32s_typec/placement';
import { GPIO_PINS, GPIO_PIN_MAP } from './nodemcu_32s_typec/gpioPins';

export const BOARD_PACKAGES: Record<BoardId, BoardPackage> = {
  nodemcu_32s_typec: {
    id: 'nodemcu_32s_typec',
    name: 'ESP32 NodeMCU-32S',
    badge: 'ESP32',
    year: 2022,
    chipTag: 'ESP-WROOM-32',
    spec: BOARD_SPEC,
    components: COMPONENTS,
    componentMap: COMPONENT_MAP,
    placements: MESH_PLACEMENTS,
    syntheticZones: SYNTHETIC_ZONES,
    gpioPins: GPIO_PINS,
    gpioPinMap: GPIO_PIN_MAP,
    tutorialSteps: [
      {
        stepNumber: 1,
        componentId: 'board',
        title: '歡迎探索 ESP32 NodeMCU-32S (Type-C) 開發板',
        body: '這是一張精準依據真實尺寸（51.5 × 28.5 mm）打造的 3D 互動 ESP32 開發板。您可以按住滑鼠左鍵旋轉、滾輪縮放，或點擊任一晶片與排針深入探索內部電路結構。',
      },
      {
        stepNumber: 2,
        componentId: 'esp_wroom_32',
        title: '運算與無線中樞：ESP-WROOM-32 屏蔽模組',
        body: '板子右半部覆蓋銀色金屬屏蔽罩的為 ESP-WROOM-32 模組。內建 240MHz 雙核心 Xtensa LX6 處理器、4MB QSPI Flash、40MHz 晶振，整合 802.11 b/g/n Wi-Fi 與藍牙 4.2 BLE 射頻。',
      },
      {
        stepNumber: 3,
        componentId: 'antenna_pcb',
        title: '全向高頻天線：2.4 GHz 倒 F 型 (MIFA) 印刷天線',
        body: '最右端突出的金色蛇行微帶線為 2.4 GHz 倒 F 天線。天線周圍實施淨空無銅處理，提供 +2.0 dBi 水平全向增益，空曠環境無線傳輸可超過 100 公尺。',
      },
      {
        stepNumber: 4,
        componentId: 'usb_type_c',
        title: '現代化連接介面：USB Type-C 雙面插拔母座',
        body: '本版本全面升級為不鏽鋼 Type-C 母座，耐受 10,000 次以上插拔。內建 CC1 / CC2 雙 5.1kΩ 下拉電阻，完美相容現代 USB-PD 充電器與 C-to-C 傳輸線。',
      },
      {
        stepNumber: 5,
        componentId: 'cp2102',
        title: '極致穩定序列橋接：Silicon Labs CP2102',
        body: 'Type-C 後方這顆 QFN-28 方形晶片為原廠 CP2102 USB 轉 UART 橋接器。支援高達 12 Mbps 傳輸速率，內建振盪器與調變解調器控制訊號，驅動支援度極佳。',
      },
      {
        stepNumber: 6,
        componentId: 'ams1117',
        title: '純淨穩壓動力：AMS1117-3.3 低壓差穩壓晶片',
        body: '左側邊緣帶有散熱金屬片的為 AMS1117-3.3 LDO。負責將 5V 輸入降至 3.3V 系統主電壓，提供高達 800mA 輸出電流，確保 Wi-Fi 發射瞬間電壓穩定不重開機。',
      },
      {
        stepNumber: 7,
        componentId: 'transistor_auto_boot',
        title: '自動化免按鍵燒錄：DTR / RTS 雙電晶體電路',
        body: '利用兩顆 SOT-23 NPN 電晶體接收 CP2102 的 DTR 與 RTS 訊號，自動在燒錄瞬間依序切換 EN 重設與 GPIO0 開機狀態，徹底免除手動按壓開關的麻煩！',
      },
      {
        stepNumber: 8,
        componentId: 'btn_en',
        title: '系統復位開關：EN 硬體重設按鍵',
        body: '位於 Type-C 左側的輕觸開關。按下即可強迫將 CHIP_PU 接地使系統冷重開機，搭配板上的 10kΩ 上拉電阻與 0.1µF 陶瓷電容進行硬體消彈跳。',
      },
      {
        stepNumber: 9,
        componentId: 'led_io2',
        title: '視覺狀態回饋：板載藍色指示燈 (GPIO2)',
        body: '由 ESP32 GPIO2 直接控制的 0603 藍色 SMD LED。是 Arduino 與 ESP-IDF 初學入門撰寫「Blink 閃爍程式」時最重要的硬體反饋燈號。',
      },
      {
        stepNumber: 10,
        componentId: 'pin_headers_left',
        title: '靈活硬體擴充：38-Pin 雙排標準擴充排針',
        body: '兩側共 38 支鍍金排針（左排 19 腳、右排 19 腳），間距 2.54mm、排距 22.86mm，完美跨接標準麵包板。點擊右側資訊卡的 GPIO 標籤頁即可查閱每支腳位的專屬功能與電氣特性！',
      },
    ],
  },
};

export const DEFAULT_BOARD_ID: BoardId = 'nodemcu_32s_typec';

export function getBoardPackage(boardId: BoardId): BoardPackage {
  const pkg = BOARD_PACKAGES[boardId];
  if (!pkg) {
    throw new Error(`Unknown board ID: ${boardId}`);
  }
  return pkg;
}
