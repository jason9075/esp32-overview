#!/usr/bin/env python3
"""
Generate SVG diagrams for ESP32 NodeMCU-32S 38-Pin Type-C:
1. `public/assets/gpio_pinout_diagram.svg` — Full 38-pin color-coded pinout chart
2. `public/assets/gpio_pins/pin_01.svg` .. `pin_38.svg` — Per-pin location + electrical diagram
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS_DIR = ROOT / "public" / "assets"
PINS_DIR = ASSETS_DIR / "gpio_pins"

ASSETS_DIR.mkdir(parents=True, exist_ok=True)
PINS_DIR.mkdir(parents=True, exist_ok=True)

# 38 pins definition: (pin_num, side, index_in_row, name, title_zh, gpio_num, pin_type, color, details)
# side: 'left' (1..19) or 'right' (20..38)
PINS = [
    (1, "left", 0, "3V3", "3.3V 穩壓電源輸出", None, "power3v3", "#ebcb8b", "AMS1117-3.3 LDO 穩壓軌輸出（建議負載 < 500mA）"),
    (2, "left", 1, "EN", "晶片重設／致能 (CHIP_PU)", None, "gpio", "#d08770", "高電位致能，低電位重設；內建 10kΩ 上拉與 0.1µF RC 延遲濾波"),
    (3, "left", 2, "VP / GPIO36", "類比輸入 ADC1_CH0 (僅能輸入)", 36, "adc", "#8fbcbb", "純輸入腳位（無內部上拉／下拉電阻），支援低雜訊 RTC ADC1"),
    (4, "left", 3, "VN / GPIO39", "類比輸入 ADC1_CH3 (僅能輸入)", 39, "adc", "#8fbcbb", "純輸入腳位（無內部上拉／下拉電阻），支援低雜訊 RTC ADC1"),
    (5, "left", 4, "D34 / GPIO34", "類比輸入 ADC1_CH6 (僅能輸入)", 34, "adc", "#8fbcbb", "純輸入腳位（無內部上拉／下拉電阻），通用類比感測器輸入"),
    (6, "left", 5, "D35 / GPIO35", "類比輸入 ADC1_CH7 (僅能輸入)", 35, "adc", "#8fbcbb", "純輸入腳位（無內部上拉／下拉電阻），通用類比感測器輸入"),
    (7, "left", 6, "D32 / GPIO32", "ADC1_CH4 / 觸控 Touch9", 32, "touch", "#88c0d0", "支援電容式觸控、RTC GPIO9、32.768kHz 外部石英晶振 XP 腳"),
    (8, "left", 7, "D33 / GPIO33", "ADC1_CH5 / 觸控 Touch8", 33, "touch", "#88c0d0", "支援電容式觸控、RTC GPIO8、32.768kHz 外部石英晶振 XN 腳"),
    (9, "left", 8, "D25 / GPIO25", "DAC1 類比輸出 / ADC2_CH8", 25, "dac", "#b48ead", "8 位元數位轉類比 (DAC1) 真實電壓輸出、音源生成與 ADC2"),
    (10, "left", 9, "D26 / GPIO26", "DAC2 類比輸出 / ADC2_CH9", 26, "dac", "#b48ead", "8 位元數位轉類比 (DAC2) 真實電壓輸出、音源生成與 ADC2"),
    (11, "left", 10, "D27 / GPIO27", "觸控 Touch7 / ADC2_CH7", 27, "touch", "#88c0d0", "支援電容式觸控、ADC2 輸入、通用高驅動能力數位 I/O"),
    (12, "left", 11, "D14 / GPIO14", "HSPI_CLK / 觸控 Touch6", 14, "spi", "#81a1c1", "硬體 HSPI 時脈輸出、ADC2_CH6、JTAG TMS 測試模式選擇"),
    (13, "left", 12, "D12 / GPIO12", "HSPI_MISO / 觸控 Touch5", 12, "spi", "#81a1c1", "開機 Strapping 腳位 (MTDI)：開機時必須為低電位以選取 3.3V Flash 電壓"),
    (14, "left", 13, "GND", "系統接地 (0V)", None, "gnd", "#616e88", "共用數位／類比接地參考點 (0V)"),
    (15, "left", 14, "D13 / GPIO13", "HSPI_MOSI / 觸控 Touch4", 13, "spi", "#81a1c1", "硬體 HSPI 資料輸出、ADC2_CH4、JTAG TCK 測試時脈"),
    (16, "left", 15, "D9 / SD2", "SPIHD (內部 Flash 專用)", 9, "flash_reserved", "#4c566a", "⚠️ 內部 4MB QSPI Flash 專用線路，嚴禁連接外部電路否則會導致當機"),
    (17, "left", 16, "D10 / SD3", "SPIWP (內部 Flash 專用)", 10, "flash_reserved", "#4c566a", "⚠️ 內部 4MB QSPI Flash 專用線路，嚴禁連接外部電路否則會導致當機"),
    (18, "left", 17, "D11 / CMD", "SPICS0 (內部 Flash 專用)", 11, "flash_reserved", "#4c566a", "⚠️ 內部 4MB QSPI Flash 專用線路，嚴禁連接外部電路否則會導致當機"),
    (19, "left", 18, "5V / VIN", "5V 系統主電源輸入", None, "power5v", "#bf616a", "直通 USB Type-C 5V VBUS 供電軌，或外接 5V DC 穩壓輸入"),

    (20, "right", 0, "GND", "系統接地 (0V)", None, "gnd", "#616e88", "共用數位／類比接地參考點 (0V)"),
    (21, "right", 1, "D23 / GPIO23", "VSPI_MOSI / 通用 I/O", 23, "spi", "#81a1c1", "主預設硬體 SPI (VSPI) MOSI 資料輸出，支援高達 80MHz 時脈"),
    (22, "right", 2, "D22 / GPIO22", "I²C SCL 時脈線", 22, "i2c", "#88c0d0", "預設硬體 Wire I²C SCL 時脈，支援 100kHz / 400kHz 快速模式"),
    (23, "right", 3, "TX / GPIO1", "UART0 TXD 序列傳送", 1, "uart", "#d08770", "序列監視埠輸出，連接至 CP2102；開機時 ROM Bootloader 會有除錯輸出"),
    (24, "right", 4, "RX / GPIO3", "UART0 RXD 序列接收", 3, "uart", "#d08770", "序列監視埠接收，連接至 CP2102 用於韌體下載與通訊"),
    (25, "right", 5, "D21 / GPIO21", "I²C SDA 資料線", 21, "i2c", "#88c0d0", "預設硬體 Wire I²C SDA 資料，支援多設備匯流排連線"),
    (26, "right", 6, "GND", "系統接地 (0V)", None, "gnd", "#616e88", "共用數位／類比接地參考點 (0V)"),
    (27, "right", 7, "D19 / GPIO19", "VSPI_MISO / 通用 I/O", 19, "spi", "#81a1c1", "主預設硬體 SPI (VSPI) MISO 資料輸入"),
    (28, "right", 8, "D18 / GPIO18", "VSPI_CLK 時脈", 18, "spi", "#81a1c1", "主預設硬體 SPI (VSPI) SCLK 序列時脈"),
    (29, "right", 9, "D5 / GPIO5", "VSPI_CS0 / Strapping 腳", 5, "spi", "#81a1c1", "硬體 SPI 片選；開機 Strapping 腳位（控制 SDIO 從屬時序，內建弱上拉）"),
    (30, "right", 10, "TX2 / GPIO17", "UART2 TXD 傳送", 17, "uart", "#d08770", "第二組硬體序列埠 (Serial2) 傳送輸出，適合連接 GPS、藍牙模組"),
    (31, "right", 11, "RX2 / GPIO16", "UART2 RXD 接收", 16, "uart", "#d08770", "第二組硬體序列埠 (Serial2) 接收輸入"),
    (32, "right", 12, "D4 / GPIO4", "ADC2_CH0 / 觸控 Touch0", 4, "touch", "#88c0d0", "電容觸控輸入 T0、ADC2_CH0、開機 Strapping 腳位"),
    (33, "right", 13, "D2 / GPIO2", "板載藍色 LED / Strapping", 2, "gpio", "#a3be8c", "連接板載藍色指示燈；開機 Strapping 腳位（進入下載模式時必須接地或懸空）"),
    (34, "right", 14, "D15 / GPIO15", "HSPI_CS0 / 觸控 Touch3", 15, "spi", "#81a1c1", "開機 Strapping 腳位 (MTDO)：控制 ROM 訊息輸出（預設高電位輸出除錯紀錄）"),
    (35, "right", 15, "D8 / SD1", "SPID (內部 Flash 專用)", 8, "flash_reserved", "#4c566a", "⚠️ 內部 4MB QSPI Flash 專用線路，嚴禁連接外部電路否則會導致當機"),
    (36, "right", 16, "D7 / SD0", "SPIQ (內部 Flash 專用)", 7, "flash_reserved", "#4c566a", "⚠️ 內部 4MB QSPI Flash 專用線路，嚴禁連接外部電路否則會導致當機"),
    (37, "right", 17, "D6 / CLK", "SPICLK (內部 Flash 專用)", 6, "flash_reserved", "#4c566a", "⚠️ 內部 4MB QSPI Flash 專用線路，嚴禁連接外部電路否則會導致當機"),
    (38, "right", 18, "GND", "系統接地 (0V)", None, "gnd", "#616e88", "共用數位／類比接地參考點 (0V)"),
]


def generate_full_pinout_svg():
    width = 1100
    height = 920

    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">',
        '  <defs>',
        '    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">',
        '      <stop offset="0%" stop-color="#1e222b"/>',
        '      <stop offset="100%" stop-color="#14171d"/>',
        '    </linearGradient>',
        '    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">',
        '      <stop offset="0%" stop-color="#e2e8f0"/>',
        '      <stop offset="100%" stop-color="#94a3b8"/>',
        '    </linearGradient>',
        '    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">',
        '      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000" flood-opacity="0.4"/>',
        '    </filter>',
        '  </defs>',
        f'  <rect width="{width}" height="{height}" fill="url(#bgGrad)" rx="16"/>',
        '  <!-- Header -->',
        '  <text x="550" y="45" font-family="sans-serif" font-size="22" font-weight="700" fill="#eceff4" text-anchor="middle">ESP32 NodeMCU-32S (38-Pin Type-C) 完整硬體腳位對應圖</text>',
        '  <text x="550" y="70" font-family="sans-serif" font-size="13" fill="#88c0d0" text-anchor="middle">雙核心 Xtensa LX6 @ 240MHz · 2.4 GHz Wi-Fi + Bluetooth 4.2 · USB Type-C</text>',
    ]

    # Draw Central PCB Illustration
    pcb_w = 260
    pcb_h = 760
    pcb_x = (width - pcb_w) // 2
    pcb_y = 110

    lines.extend([
        f'  <g filter="url(#shadow)">',
        f'    <rect x="{pcb_x}" y="{pcb_y}" width="{pcb_w}" height="{pcb_h}" rx="12" fill="#1e242c" stroke="#333c4a" stroke-width="2"/>',
        f'    <!-- USB Type-C Receptacle at bottom -->',
        f'    <rect x="{pcb_x + 85}" y="{pcb_y + pcb_h - 45}" width="90" height="40" rx="6" fill="#cbd5e1" stroke="#94a3b8" stroke-width="2"/>',
        f'    <rect x="{pcb_x + 95}" y="{pcb_y + pcb_h - 35}" width="70" height="20" rx="3" fill="#0f172a"/>',
        f'    <text x="{pcb_x + 130}" y="{pcb_y + pcb_h - 22}" font-family="sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">TYPE-C</text>',
        f'    <!-- ESP-WROOM-32 Module at top -->',
        f'    <rect x="{pcb_x + 25}" y="{pcb_y + 30}" width="210" height="230" rx="6" fill="#0f172a" stroke="#252e39"/>',
        f'    <rect x="{pcb_x + 35}" y="{pcb_y + 90}" width="190" height="160" rx="6" fill="url(#shieldGrad)"/>',
        f'    <text x="{pcb_x + 130}" y="{pcb_y + 140}" font-family="sans-serif" font-size="13" font-weight="700" fill="#1e293b" text-anchor="middle">Espressif</text>',
        f'    <text x="{pcb_x + 130}" y="{pcb_y + 165}" font-family="sans-serif" font-size="15" font-weight="800" fill="#0f172a" text-anchor="middle">ESP-WROOM-32</text>',
        f'    <text x="{pcb_x + 130}" y="{pcb_y + 190}" font-family="sans-serif" font-size="10" fill="#334155" text-anchor="middle">FCC ID: 2AC7Z-ESPWROOM32</text>',
        f'    <!-- MIFA Antenna Traces -->',
        f'    <path d="M {pcb_x + 50} {pcb_y + 45} h 160 v 15 h -40 v 15 h 40" stroke="#f59e0b" stroke-width="3" fill="none"/>',
        f'    <!-- CP2102 IC -->',
        f'    <rect x="{pcb_x + 95}" y="{pcb_y + 360}" width="70" height="70" rx="4" fill="#0b0f14" stroke="#475569"/>',
        f'    <text x="{pcb_x + 130}" y="{pcb_y + 395}" font-family="sans-serif" font-size="10" font-weight="600" fill="#94a3b8" text-anchor="middle">SILABS</text>',
        f'    <text x="{pcb_x + 130}" y="{pcb_y + 412}" font-family="sans-serif" font-size="9" fill="#64748b" text-anchor="middle">CP2102</text>',
        f'    <!-- AMS1117 -->',
        f'    <rect x="{pcb_x + 40}" y="{pcb_y + 480}" width="70" height="45" rx="3" fill="#0b0f14" stroke="#475569"/>',
        f'    <text x="{pcb_x + 75}" y="{pcb_y + 508}" font-family="sans-serif" font-size="9" fill="#94a3b8" text-anchor="middle">AMS1117</text>',
        f'    <!-- EN & BOOT Buttons -->',
        f'    <rect x="{pcb_x + 35}" y="{pcb_y + pcb_h - 100}" width="40" height="35" rx="4" fill="#64748b"/>',
        f'    <rect x="{pcb_x + 45}" y="{pcb_y + pcb_h - 93}" width="20" height="20" rx="10" fill="#1e293b"/>',
        f'    <text x="{pcb_x + 55}" y="{pcb_y + pcb_h - 110}" font-family="sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">EN</text>',
        f'    <rect x="{pcb_x + 185}" y="{pcb_y + pcb_h - 100}" width="40" height="35" rx="4" fill="#64748b"/>',
        f'    <rect x="{pcb_x + 195}" y="{pcb_y + pcb_h - 93}" width="20" height="20" rx="10" fill="#1e293b"/>',
        f'    <text x="{pcb_x + 205}" y="{pcb_y + pcb_h - 110}" font-family="sans-serif" font-size="10" fill="#94a3b8" text-anchor="middle">BOOT</text>',
        f'  </g>',
    ])

    # Draw 38 Pins (19 on left, 19 on right)
    y_start = 140
    y_spacing = 38

    for pin_data in PINS:
        p_num, side, idx, name, title_zh, gpio_num, p_type, color, details = pin_data
        y_pos = y_start + idx * y_spacing

        if side == "left":
            pin_cx = pcb_x + 15
            lines.extend([
                f'  <!-- Pin {p_num} (Left) -->',
                f'  <circle cx="{pin_cx}" cy="{y_pos}" r="7" fill="{color}" stroke="#1e242c" stroke-width="2"/>',
                f'  <text x="{pin_cx}" y="{y_pos + 4}" font-family="sans-serif" font-size="9" font-weight="700" fill="#1e242c" text-anchor="middle">{p_num}</text>',
                f'  <!-- Label Card Left -->',
                f'  <g transform="translate({pin_cx - 380}, {y_pos - 15})">',
                f'    <rect width="365" height="30" rx="6" fill="#252b36" stroke="{color}" stroke-opacity="0.4" stroke-width="1.5"/>',
                f'    <rect width="70" height="30" rx="6" fill="{color}" fill-opacity="0.2"/>',
                f'    <text x="35" y="19" font-family="sans-serif" font-size="11" font-weight="700" fill="{color}" text-anchor="middle">{name.split(" / ")[0]}</text>',
                f'    <text x="80" y="19" font-family="sans-serif" font-size="11" fill="#eceff4">{title_zh}</text>',
                f'  </g>',
                f'  <line x1="{pin_cx - 15}" y1="{y_pos}" x2="{pin_cx - 8}" y2="{y_pos}" stroke="{color}" stroke-width="1.5"/>',
            ])
        else:
            pin_cx = pcb_x + pcb_w - 15
            lines.extend([
                f'  <!-- Pin {p_num} (Right) -->',
                f'  <circle cx="{pin_cx}" cy="{y_pos}" r="7" fill="{color}" stroke="#1e242c" stroke-width="2"/>',
                f'  <text x="{pin_cx}" y="{y_pos + 4}" font-family="sans-serif" font-size="9" font-weight="700" fill="#1e242c" text-anchor="middle">{p_num}</text>',
                f'  <!-- Label Card Right -->',
                f'  <g transform="translate({pin_cx + 15}, {y_pos - 15})">',
                f'    <rect width="365" height="30" rx="6" fill="#252b36" stroke="{color}" stroke-opacity="0.4" stroke-width="1.5"/>',
                f'    <rect width="70" height="30" rx="6" fill="{color}" fill-opacity="0.2"/>',
                f'    <text x="35" y="19" font-family="sans-serif" font-size="11" font-weight="700" fill="{color}" text-anchor="middle">{name.split(" / ")[0]}</text>',
                f'    <text x="80" y="19" font-family="sans-serif" font-size="11" fill="#eceff4">{title_zh}</text>',
                f'  </g>',
                f'  <line x1="{pin_cx + 8}" y1="{y_pos}" x2="{pin_cx + 15}" y2="{y_pos}" stroke="{color}" stroke-width="1.5"/>',
            ])

    lines.append('</svg>')

    out_file = ASSETS_DIR / "gpio_pinout_diagram.svg"
    out_file.write_text("\n".join(lines), encoding="utf-8")
    print(f"✅ Generated: {out_file}")


def generate_single_pin_svg(pin_data):
    p_num, side, idx, name, title_zh, gpio_num, p_type, color, details = pin_data
    w = 560
    h = 280

    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">',
        '  <defs>',
        '    <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">',
        '      <stop offset="0%" stop-color="#242933"/>',
        '      <stop offset="100%" stop-color="#191c24"/>',
        '    </linearGradient>',
        '  </defs>',
        f'  <rect width="{w}" height="{h}" rx="12" fill="url(#cardBg)" stroke="{color}" stroke-width="2"/>',
        f'  <!-- Pin Badge -->',
        f'  <circle cx="50" cy="50" r="26" fill="{color}"/>',
        f'  <text x="50" y="58" font-family="sans-serif" font-size="20" font-weight="800" fill="#1b1f27" text-anchor="middle">{p_num}</text>',
        f'  <text x="95" y="42" font-family="sans-serif" font-size="20" font-weight="700" fill="#eceff4">{name}</text>',
        f'  <text x="95" y="66" font-family="sans-serif" font-size="13" fill="{color}">{title_zh}</text>',
        f'  <!-- Divider -->',
        f'  <line x1="24" y1="92" x2="{w - 24}" y2="92" stroke="#3b4252" stroke-width="1"/>',
        f'  <!-- Details -->',
        f'  <text x="28" y="125" font-family="sans-serif" font-size="12" font-weight="600" fill="#88c0d0">排針排別：{"左側排 (Pins 1..19)" if side == "left" else "右側排 (Pins 20..38)"} · 第 {idx + 1} 腳位</text>',
        f'  <text x="28" y="152" font-family="sans-serif" font-size="12" font-weight="600" fill="#88c0d0">信號類型：{p_type.upper()}</text>',
    ]

    if gpio_num is not None:
        lines.append(f'  <text x="28" y="179" font-family="sans-serif" font-size="12" fill="#d8dee9">GPIO 編號：GPIO {gpio_num} (ESP32-D0WDQ6 內部暫存器編號)</text>')

    lines.extend([
        f'  <rect x="24" y="195" width="{w - 48}" height="65" rx="8" fill="#1e222a"/>',
        f'  <text x="36" y="222" font-family="sans-serif" font-size="12" fill="#e5e9f0">{details[:42]}</text>',
        f'  <text x="36" y="244" font-family="sans-serif" font-size="12" fill="#d8dee9">{details[42:85]}</text>',
        '</svg>',
    ])

    out_file = PINS_DIR / f"pin_{p_num:02d}.svg"
    out_file.write_text("\n".join(lines), encoding="utf-8")


def main():
    print("🎨 Generating ESP32 38-Pin GPIO SVG pinout diagrams...")
    generate_full_pinout_svg()
    for pin_data in PINS:
        generate_single_pin_svg(pin_data)
    print(f"✅ Generated 38 individual pin SVGs in {PINS_DIR}")


if __name__ == "__main__":
    main()
