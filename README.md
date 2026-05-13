# 📈 Stock Portfolio Assistant

ผู้ช่วยจัดการพอร์ตหุ้นสหรัฐ พร้อมกราฟ Candlestick และ AI วิเคราะห์แนวโน้ม

## Features

- 📊 กราฟราคาแบบ Candlestick (1D, 1W, 1M, 3M, 1Y) powered by TradingView Lightweight Charts
- 💼 จัดการพอร์ต: เพิ่ม/ลบหุ้น, ดู P&L แบบ Realtime
- 🔄 อัปเดตราคาอัตโนมัติพร้อม In-memory Cache (quote: 1 นาที, history: 10 นาที)
- 🤖 AI วิเคราะห์แนวโน้ม + จุดซื้อ/ขาย รองรับ 3 Provider:
  - **Google Gemini 2.0 Flash** — ฟรี (สมัครที่ aistudio.google.com)
  - **Groq Llama 3.3 70B** — ฟรี (สมัครที่ console.groq.com)
  - **Claude Sonnet** — มีค่าใช้จ่าย (สมัครที่ console.anthropic.com)

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express (ESM)
- **Charts**: TradingView Lightweight Charts
- **Stock Data**: [Twelve Data API](https://twelvedata.com) (ฟรี 800 req/วัน)

## API Keys ที่ต้องใช้

| Key | ใช้ทำอะไร | ฟรีไหม | สมัครที่ |
|-----|-----------|--------|----------|
| `TWELVE_DATA_KEY` | ดึงข้อมูลราคาหุ้น | ✅ 800 req/วัน | [twelvedata.com/register](https://twelvedata.com/register) |
| Gemini API Key | AI วิเคราะห์ | ✅ ฟรี | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| Groq API Key | AI วิเคราะห์ (ทางเลือก) | ✅ ฟรี | [console.groq.com/keys](https://console.groq.com/keys) |
| Anthropic API Key | AI วิเคราะห์ (ทางเลือก) | 💳 มีค่าใช้จ่าย | [console.anthropic.com](https://console.anthropic.com) |

> **หมายเหตุ**: ต้องมีเฉพาะ `TWELVE_DATA_KEY` เท่านั้นถึงจะรันได้ ส่วน AI Key ใส่ในหน้าเว็บโดยตรงได้เลย (เก็บใน localStorage)

## การติดตั้ง

### 1. ติดตั้ง dependencies

```bash
npm run install:all
```

### 2. สร้างไฟล์ `.env` ที่ root ของโปรเจค

```bash
# คัดลอกจาก example
cp .env.example .env
```

แก้ไขค่าใน `.env`:

```env
TWELVE_DATA_KEY=your_twelve_data_api_key_here
```

### 3. รัน Development Server

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/api/health

## โครงสร้างโปรเจค

```
stock-portfolio-assistant/
├── client/                  # React + Vite
│   └── src/
│       ├── components/
│       │   ├── StockChart.jsx    # กราฟ Candlestick
│       │   └── AIAnalysis.jsx    # AI วิเคราะห์ (Gemini / Groq / Claude)
│       └── api/
│           └── stocks.js         # fetch wrapper สำหรับ backend
├── server/                  # Express API Server
│   └── index.js             # Routes + Twelve Data integration + Cache
├── .env.example
└── package.json             # root scripts (concurrently)
```

## วิธีใช้

1. กด **เพิ่มหุ้น** แล้วกรอก Symbol เช่น `AAPL`, `TSLA`, `NVDA`
2. กรอกจำนวนหุ้นและราคาต้นทุนเฉลี่ย
3. คลิกหุ้นใน Portfolio เพื่อดูกราฟ Candlestick
4. กด **✨ วิเคราะห์** → เลือก AI Provider → ใส่ API Key → รับคำแนะนำ ซื้อ/ถือ/ขาย

## ข้อจำกัดที่ควรรู้

- **Twelve Data free tier**: 8 req/นาที — server จะ throttle อัตโนมัติ โหลดครั้งแรกอาจช้า 7-8 วินาทีต่อ symbol
- **ข้อมูลราคา**: delay ประมาณ 15-20 นาทีจากตลาดจริง
- **AI Analysis**: ใช้ประกอบการตัดสินใจเท่านั้น ไม่ใช่คำแนะนำทางการเงิน
