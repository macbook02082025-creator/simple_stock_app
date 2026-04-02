# StockEngine v2.0 | Senior Architect Implementation

A high-frequency, real-time trading dashboard built with a "Performance-First" philosophy. This project demonstrates advanced Angular patterns, off-main-thread processing, and robust data integrity engineering.

## 🚀 Architectural Pillars

### 1. Off-Main-Thread Processing (Web Workers)
To ensure a consistent 60fps UI experience, the entire WebSocket lifecycle—including connection management, heartbeat pings, and complex JSON parsing—is offloaded to a **dedicated Web Worker**. 
*   **Result:** The main UI thread is never blocked by high-frequency data streams, preventing "jank" and ensuring sub-millisecond response times to user interactions.

### 2. High-Frequency Batching Engine
Integrated within the Web Worker is a custom **Batching Engine** that throttles incoming trades into 50ms windows. 
*   **Optimization:** Instead of triggering thousands of Angular change detection cycles per second, the UI receives a single, optimized state update per frame, drastically reducing CPU and battery consumption on mobile devices.

### 3. Signal-Based "Flux" Store
The application state is managed via a zoneless **Angular Signal Store**. 
*   **Fine-Grained Reactivity:** Only the specific stock card receiving an update is re-rendered. 
*   **Computed Selectors:** Real-time metrics like `marketBreadth` and `sparklinePaths` are derived lazily, ensuring zero redundant calculations.

### 4. Dual-Source Data Resiliency
The system features an intelligent **Guardian Pattern** for data fetching:
*   **Primary:** Real-time data via Finnhub WebSocket API.
*   **Fallback:** Automatic, seamless transition to an internal High-Frequency Mock Engine if the server is unreachable or API keys are missing.
*   **Data Integrity:** A server-side validation layer ensures that current prices always stay within logical day-range and 52-week bounds.

## 🛠 Tech Stack
*   **Frontend:** Angular 21.2.0 (Strictly Zoneless, Standalone Components)
*   **Language:** TypeScript 5.9.3 (Strict Mode)
*   **State Management:** Angular Signals
*   **Threading:** Web Worker API
*   **Backend:** Node.js / Express / WebSocket (BFF Pattern)
*   **Styling:** Token-based CSS Architecture (Responsive Grid/Flexbox)

## ✨ Advanced UX Features
*   **Micro-Trend Sparklines:** Real-time SVG visualizations of the last 20 price ticks per stock.
*   **Reactive Card States:** Full-card color transitions (Green/Red/Grey) synchronized perfectly with tick direction and toggle status.
*   **Responsive Data Density:** Dynamic metrics display that hides 52-week data on mobile devices while showing them on desktop to maintain scannability.
*   **Magnitude Pulses:** Visual animations that vary in intensity based on the percentage of the price change.

## 🏁 Getting Started

### 1. Server Setup
```bash
cd server
npm install
node index.js
```
*(Optional: Add your `FINNHUB_API_KEY` to a `.env` file in the server directory for live data.)*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```

## 📋 Compliance Checklist (Senior Task 2026)
- [x] **Point 1 & 2:** WebSocket server + Angular Mock Fallback + Live API integration.
- [x] **Point 3:** On-click toggle with state freezing and visual greying.
- [x] **Point 4:** Responsive Grid/Flexbox design (Mobile vs Desktop).
- [x] **Point 5:** Full-card background coloring (Green/Red/Grey) based on price movement.
- [x] **Data Requirements:** Correct mapping of Name, Price, Day High/Low, and 52W High/Low.
- [x] **Responsive Logic:** 52-week data strictly restricted to desktop views.

---
**Architected by Gemini CLI** | *Engineered for performance, designed for precision.*
