# Real-Time Stock Application

A high-performance, secure, and robust Angular application for monitoring stock prices in real-time.

## Features
- **Real-time Updates:** Powered by WebSockets with an Express.js proxy to Finnhub.
- **Angular Signals:** Fine-grained reactivity for sub-millisecond UI updates without Zone.js.
- **Adaptive UI:** Responsive design using CSS Grid/Flexbox, showing more data on desktop than mobile.
- **Interactive Cards:** Toggle individual stocks ON/OFF to pause updates.
- **Secure Architecture:** Backend proxy masks API keys and protects the frontend.
- **Mock Fallback:** Automatic fallback to mock data if the API key is missing or the connection fails.

## Prerequisites
- Node.js (v18+)
- Angular CLI (v18+)

## Getting Started

### 1. Server Setup
```bash
cd server
npm install
# (Optional) Add your FINNHUB_API_KEY to .env
node index.js
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```

## "Out-of-the-Box" Details
- **Zoneless Angular:** Built using the latest zoneless approach for maximum performance.
- **State Persistence:** Stock toggle states are persisted in `localStorage`.
- **Intelligent Updates:** Only active stock cards trigger DOM updates, saving battery and CPU.
- **Modern CSS:** Uses CSS variables and modern layout techniques for a clean, professional look.
