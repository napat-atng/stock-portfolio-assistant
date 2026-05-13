# 📈 Stock Portfolio Assistant

ผู้ช่วยจัดการพอร์ตหุ้นสหรัฐ พร้อมกราฟ Real-time และ AI วิเคราะห์แนวโน้ม

## Features
- 📊 กราฟราคาแบบ Candlestick (1D, 1W, 1M, 3M, 1Y)
- 💼 จัดการพอร์ต: เพิ่ม/ลบหุ้น, ดู P&L
- 🔄 อัปเดตราคาอัตโนมัติทุก 30 วินาที
- 🤖 AI วิเคราะห์แนวโน้ม + จุดซื้อ/ขาย (Claude API)

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Charts**: TradingView Lightweight Charts

## การติดตั้ง

### 1. ติดตั้ง dependencies ทั้งหมด
```bash
npm run install:all
```

### 2. ตั้งค่า API Key
สร้างไฟล์ `.env` ใน folder `client/`:
```
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```
> หรือจะกรอก API Key ในหน้าแอปโดยตรงก็ได้ครับ

### 3. รัน Development Server
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## วิธีใช้
1. กด **เพิ่มหุ้น** แล้วกรอก Symbol เช่น AAPL, TSLA, NVDA
2. กรอกจำนวนหุ้นและราคาต้นทุนเฉลี่ย
3. คลิกหุ้นใน Portfolio เพื่อดูกราฟ
4. กด **วิเคราะห์ด้วย AI** เพื่อรับคำแนะนำ

## หมายเหตุ
- ข้อมูลราคามาจาก Yahoo Finance (อาจ delay 15-20 นาที)
- AI Analysis ใช้ Claude API ต้องมี API Key จาก https://console.anthropic.com
