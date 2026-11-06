# ESP32 NodeMCU-32S (38-Pin Type-C) 3D 互動硬體架構導覽

這是一個基於 **Three.js + TypeScript + Vite** 建構的高互動性 ESP32 NodeMCU-32S（38-Pin USB Type-C 版本）3D 硬體架構探索專案。提供毫米級精確度 3D 模型、正反面全元件點擊聚焦、繁體中文深度硬體解析、完整的 38-Pin GPIO 腳位定義圖表以及互動引導教學。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-0.174-green.svg)

---

## 🌟 核心特色

1. **真實 3D 幾何結構**：
   - 根據真實 NodeMCU-32S 規格建模（`51.5 × 28.5 × 1.6 mm`，2.54 mm 間距 38-Pin 雙排針，0.9 吋標準麵包板排距）。
   - 包含 USB Type-C 雙面插拔連接埠、ESP-WROOM-32 金屬屏蔽模組、2.4 GHz 倒 F 型（MIFA）PCB 天線、Silicon Labs CP2102 USB 橋接晶片、AMS1117-3.3 高效率 LDO、雙電晶體自動下載電路、實體 EN / BOOT 按鍵與電源/IO2 指示燈。
2. **高效能 BVH 點擊拾取與光影著色**：
   - 採用 `three-mesh-bvh` 空間加速樹，點擊拾取延遲低於 1ms。
   - 內建 PBR 物理渲染材質與 ACESFilmic 色調對映，精準呈現金屬屏蔽罩拉絲質感與電路板霧黑防焊層。
3. **繁體中文深度硬體解析**：
   - 全面解析 ESP32-D0WDQ6 雙核心 Xtensa LX6 微處理器、內部 4MB QSPI Flash、40MHz 高精度晶振與射頻匹配網絡。
   - 詳解 Type-C CC1 / CC2 5.1kΩ 下拉電阻原理、DTR/RTS 自動重設電路及 AMS1117 電源濾波設計。
4. **完整 38-Pin GPIO 腳位圖表與 3D 標定**：
   - 互動式 38 腳位速查表，支援依電源、I²C、UART、SPI、ADC/Touch、DAC、GPIO 類別篩選。
   - 點擊任一腳位即可在 3D 排針上高亮顯示實體位置與電氣特性警告（如 Strapping 腳位限制、輸入專用腳等）。
5. **逐步互動引導教學 (Interactive Tutorial)**：
   - 引導初學者一步步認識 ESP32 開發板的核心運算中樞、天線、通訊介面與供電架構。

---

## 🚀 快速開始

### 安裝依賴
```bash
npm install
```

### 啟動開發伺服器
```bash
npm run dev
```
瀏覽器開啟 `http://localhost:5173` 即可開始操作。

### 建置生產環境版本
```bash
npm run build
npm run preview
```

### 驗證硬體模型與幾何資訊
```bash
npm run check:hardware
```

### 執行端對端自動化截圖驗證
```bash
npm run screenshots
```

---

## 📐 座標系統與硬體規格

- **座標系統 (Three.js Y-up, 1 unit = 1 mm, 主機板中心位於原點 `(0, 0, 0)`)**:
  - `X` (`[-25.75, +25.75] mm`): 左側 (`-X`) 為 USB Type-C 與控制開關；右側 (`+X`) 為 ESP-WROOM-32 與天線端。
  - `Y`: 板面法線 (`+Y` 為正面元件面，`-Y` 為背面走線面；PCB 基板介於 `[-0.8, +0.8] mm`，厚度 1.6 mm)。
  - `Z` (`[-14.25, +14.25] mm`): `-Z` 為左側 19-Pin 排針（Pin 1~19，位於 `Z = -11.43 mm`）；`+Z` 為右側 19-Pin 排針（Pin 20~38，位於 `Z = +11.43 mm`）。

---

## 🛠️ 專案技術棧

- **核心繪圖**：[Three.js](https://threejs.org/) + [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh)
- **語言與架構**：TypeScript 5.7 (嚴格型別模式), 原生 DOM 元件架構
- **構建工具**：[Vite](https://vitejs.dev/)
- **端對端驗證**：[Playwright](https://playwright.dev/)
- **3D 模型產生**：Blender Python 自動化流水線

---

## 📄 授權條款

MIT License
