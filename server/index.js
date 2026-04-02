require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 8080;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

// Fixed list of 4 stocks per assignment
const STOCKS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];

// Data Integrity: Validated initial state
let stockData = {
  AAPL: { symbol: 'AAPL', name: 'Apple Inc.', price: 232.98, high: 238.20, low: 198.40, h52: 250.00, l52: 170.00 },
  GOOGL: { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 167.89, high: 188.00, low: 156.43, h52: 200.00, l52: 130.00 },
  MSFT: { symbol: 'MSFT', name: 'Microsoft Corp.', price: 454.95, high: 456.30, low: 423.86, h52: 480.00, l52: 310.00 },
  TSLA: { symbol: 'TSLA', name: 'Tesla Inc.', price: 196.82, high: 205.04, low: 184.75, h52: 290.00, l52: 150.00 },
};

/**
 * REQUIREMENT POINT 2: Real-time price updates via external API (Finnhub)
 * with automatic fallback to mock simulation.
 */
function initRealTimeEngine() {
  if (!FINNHUB_API_KEY) {
    console.log('No API Key found. Using Mock Simulation Engine.');
    startMockSimulation();
    return;
  }

  const socket = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`);

  socket.on('open', () => {
    console.log('Connected to Finnhub Real-time API');
    STOCKS.forEach(s => socket.send(JSON.stringify({ type: 'subscribe', symbol: s })));
  });

  socket.on('message', (data) => {
    const parsed = JSON.parse(data);
    if (parsed.type === 'trade') {
      handleIncomingTrades(parsed.data);
    }
  });

  socket.on('error', (err) => {
    console.error('Finnhub WS Error:', err.message);
    startMockSimulation();
  });

  socket.on('close', () => {
    console.log('Finnhub Connection closed. Falling back to Mock.');
    startMockSimulation();
  });
}

function handleIncomingTrades(trades) {
  const updates = trades.map(trade => {
    const symbol = trade.s;
    const price = parseFloat(trade.p.toFixed(2));
    
    if (stockData[symbol]) {
      stockData[symbol].price = price;
      stockData[symbol].high = Math.max(stockData[symbol].high, price);
      stockData[symbol].low = Math.min(stockData[symbol].low, price);
      stockData[symbol].h52 = Math.max(stockData[symbol].h52, stockData[symbol].high);
      stockData[symbol].l52 = Math.min(stockData[symbol].l52, stockData[symbol].low);
    }

    return {
      s: symbol,
      p: price,
      high: stockData[symbol]?.high,
      low: stockData[symbol]?.low,
      h52: stockData[symbol]?.h52,
      l52: stockData[symbol]?.l52
    };
  });

  broadcast({ type: 'trade', data: updates });
}

function startMockSimulation() {
  console.log('Starting High-Frequency Mock Engine...');
  setInterval(() => {
    const symbol = STOCKS[Math.floor(Math.random() * STOCKS.length)];
    const current = stockData[symbol];
    const change = (Math.random() - 0.5) * 2;
    const newPrice = parseFloat((current.price + change).toFixed(2));
    
    handleIncomingTrades([{ s: symbol, p: newPrice }]);
  }, 500);
}

function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    type: 'snapshot',
    data: Object.values(stockData).map(s => ({
      s: s.symbol,
      name: s.name,
      p: s.price,
      high: s.high,
      low: s.low,
      h52: s.h52,
      l52: s.l52
    }))
  }));

  ws.on('message', (msg) => {
    if (msg.toString() === 'ping') ws.send('pong');
  });
});

initRealTimeEngine();

server.listen(PORT, () => {
  console.log(`Stock Server running on port ${PORT}`);
});
