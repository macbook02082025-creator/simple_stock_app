/// <reference lib="webworker" />

let socket: WebSocket | null = null;
let reconnectAttempts = 0;
let heartbeatInterval: any = null;
let lastPongReceived = Date.now();
const MAX_BACKOFF = 30000;
const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 5000;

// --- BATCHING ENGINE CONFIGURATION ---
// Advanced Architect Feature: To prevent UI thread locking during extreme market volatility,
// we batch incoming WebSocket messages in the Worker and flush them to the main thread at a
// fixed interval. 50ms ensures a maximum of 20 updates per second (higher than UI refresh rate
// but low enough to drastically reduce Angular change detection churn).
const BATCH_FLUSH_MS = 50; 
let tradeBatchBuffer: any[] = [];
let batchFlushInterval: any = null;

function connect(url: string) {
  if (socket) {
    socket.close();
  }

  socket = new WebSocket(url);

  socket.onopen = () => {
    reconnectAttempts = 0;
    lastPongReceived = Date.now();
    postMessage({ type: 'STATUS', status: 'connected' });
    startHeartbeat();
    startBatchingEngine();
  };

  socket.onmessage = (event) => {
    if (event.data === 'pong') {
      lastPongReceived = Date.now();
      return;
    }

    try {
      const parsedData = JSON.parse(event.data);
      
      // Basic Payload Validation (Guardian Pattern)
      if (isValidPayload(parsedData)) {
        if (parsedData.type === 'trade') {
          // Instead of immediately sending to the main thread, accumulate in the buffer
          tradeBatchBuffer.push(...parsedData.data);
        } else {
          // Snapshots and other critical non-trade data should go through immediately
          postMessage({ type: 'DATA', payload: parsedData });
        }
      }
    } catch (e) {
      console.error('Worker JSON parse error', e);
    }
  };

  socket.onclose = () => {
    stopHeartbeat();
    stopBatchingEngine();
    postMessage({ type: 'STATUS', status: 'disconnected' });
    const delay = Math.min(Math.pow(2, reconnectAttempts) * 1000, MAX_BACKOFF);
    reconnectAttempts++;
    setTimeout(() => connect(url), delay);
  };
}

function startBatchingEngine() {
  if (batchFlushInterval) clearInterval(batchFlushInterval);
  
  batchFlushInterval = setInterval(() => {
    if (tradeBatchBuffer.length > 0) {
      // Flush the buffer to the main thread as a single unified trade event
      postMessage({ 
        type: 'DATA', 
        payload: { 
          type: 'trade', 
          data: tradeBatchBuffer 
        } 
      });
      // Clear the buffer for the next window
      tradeBatchBuffer = [];
    }
  }, BATCH_FLUSH_MS);
}

function stopBatchingEngine() {
  if (batchFlushInterval) {
    clearInterval(batchFlushInterval);
    batchFlushInterval = null;
  }
  tradeBatchBuffer = []; // Clear pending
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send('ping');
      
      // If no pong for too long, force close and reconnect
      if (Date.now() - lastPongReceived > HEARTBEAT_INTERVAL + HEARTBEAT_TIMEOUT) {
        console.warn('Heartbeat timeout - reconnecting...');
        socket.close();
      }
    }
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

function isValidPayload(data: any): boolean {
  return (
    (data.type === 'snapshot' && Array.isArray(data.data)) ||
    (data.type === 'trade' && Array.isArray(data.data))
  );
}

addEventListener('message', ({ data }) => {
  if (data.type === 'CONNECT') {
    connect(data.url);
  }
});