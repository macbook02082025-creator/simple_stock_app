require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

// Keep track of connected clients
const clients = new Set();

// Our list of 4 stocks
const STOCKS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];

// This will store the data retrieved from the REST API or mocked
let stockData = {
  AAPL: { price: 220.5, high: 225.0, low: 218.5, name: 'Apple Inc.', h52: 230.0, l52: 170.0 },
  GOOGL: { price: 185.2, high: 188.0, low: 183.5, name: 'Alphabet Inc.', h52: 200.0, l52: 130.0 },
  MSFT: { price: 430.8, high: 435.0, low: 428.5, name: 'Microsoft Corp.', h52: 460.0, l52: 310.0 },
  TSLA: { price: 190.4, high: 195.0, low: 188.5, name: 'Tesla Inc.', h52: 290.0, l52: 150.0 },
};

async function fetchInitialStockData() {
  if (!FINNHUB_API_KEY) {
    console.log('No FINNHUB_API_KEY. Using hardcoded stock profiles.');
    return;
  }

  console.log('Fetching stock profiles and quotes from Finnhub REST API...');
  
  for (const symbol of STOCKS) {
    try {
      // 1. Fetch Profile (to get the Name)
      const profile = await axios.get(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
      // 2. Fetch Quote (to get current price, high/low)
      const quote = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
      // 3. Fetch Basic Financials (to get 52w highs/lows)
      const metrics = await axios.get(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`);

      stockData[symbol] = {
        symbol,
        name: profile.data.name || symbol,
        price: quote.data.c || stockData[symbol].price,
        high: quote.data.h || stockData[symbol].high,
        low: quote.data.l || stockData[symbol].low,
        h52: metrics.data.metric['52WeekHigh'] || stockData[symbol].h52,
        l52: metrics.data.metric['52WeekLow'] || stockData[symbol].l52,
      };
      console.log(`Updated data for ${symbol} via API.`);
    } catch (error) {
      console.error(`Error fetching REST API data for ${symbol}:`, error.message);
    }
  }
}

function generateUpdate() {
  const symbol = STOCKS[Math.floor(Math.random() * STOCKS.length)];
  const change = (Math.random() - 0.5) * 2;
  stockData[symbol].price = parseFloat((stockData[symbol].price + change).toFixed(2));
  
  if (stockData[symbol].price > stockData[symbol].high) stockData[symbol].high = stockData[symbol].price;
  if (stockData[symbol].price < stockData[symbol].low) stockData[symbol].low = stockData[symbol].price;
  
  return {
    type: 'trade',
    data: [{
      s: symbol,
      p: stockData[symbol].price,
      t: Date.now(),
      v: 1,
      name: stockData[symbol].name,
      high: stockData[symbol].high,
      low: stockData[symbol].low,
      h52: stockData[symbol].h52,
      l52: stockData[symbol].l52
    }]
  };
}

let mockInterval;

function startMocking() {
  if (mockInterval) clearInterval(mockInterval);
  console.log('Starting real-time mock price updates...');
  mockInterval = setInterval(() => {
    const update = generateUpdate();
    broadcast(update);
  }, 1000);
}

function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// WebSocket server logic
wss.on('connection', (ws) => {
  console.log('Frontend client connected via WebSocket');
  clients.add(ws);

  // Send initial data snapshot
  ws.send(JSON.stringify({
    type: 'snapshot',
    data: Object.keys(stockData).map(s => ({
      s,
      p: stockData[s].price,
      high: stockData[s].high,
      low: stockData[s].low,
      name: stockData[s].name,
      h52: stockData[s].h52,
      l52: stockData[s].l52
    }))
  }));

  ws.on('message', (message) => {
    if (message.toString() === 'ping') {
      ws.send('pong');
    }
  });

  ws.on('close', () => {
    console.log('Frontend client disconnected from WebSocket');
    clients.delete(ws);
  });
});

// REST Endpoint to show a traditional API call in the browser's Network tab
app.get('/api/stocks', (req, res) => {
  console.log('REST API called: GET /api/stocks');
  res.json(Object.keys(stockData).map(symbol => ({
    symbol,
    name: stockData[symbol].name,
    h52: stockData[symbol].h52,
    l52: stockData[symbol].l52,
    price: stockData[symbol].price,
    high: stockData[symbol].high,
    low: stockData[symbol].low
  })));
});

// Setup Real-time logic
async function init() {
  await fetchInitialStockData();

  if (!FINNHUB_API_KEY) {
    console.log('No FINNHUB_API_KEY. Running everything in mock mode.');
    startMocking();
  } else {
    const finnhubSocket = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`);
    
    finnhubSocket.on('open', () => {
      console.log('Connected to Finnhub Real-time WebSocket');
      STOCKS.forEach(s => finnhubSocket.send(JSON.stringify({ type: 'subscribe', symbol: s })));
    });

    finnhubSocket.on('message', (data) => {
      const parsed = JSON.parse(data);
      if (parsed.type === 'trade') {
        const enrichedData = parsed.data.map(item => {
          // Update local stockData state with newest real-time price
          if (stockData[item.s]) {
            stockData[item.s].price = item.p;
            if (item.p > stockData[item.s].high) stockData[item.s].high = item.p;
            if (item.p < stockData[item.s].low) stockData[item.s].low = item.p;

            return {
              ...item,
              name: stockData[item.s].name,
              high: stockData[item.s].high,
              low: stockData[item.s].low,
              h52: stockData[item.s].h52,
              l52: stockData[item.s].l52
            };
          }
          return item;
        });
        broadcast({ type: 'trade', data: enrichedData });
      }
    });

    finnhubSocket.on('error', (err) => {
      console.error('Finnhub WS Error:', err.message);
      startMocking();
    });

    finnhubSocket.on('close', () => {
      console.log('Finnhub WS Connection closed. Switching to mock mode.');
      startMocking();
    });
  }
}

init();

server.listen(PORT, () => {
  console.log(`WebSocket server is listening on port ${PORT}`);
});
