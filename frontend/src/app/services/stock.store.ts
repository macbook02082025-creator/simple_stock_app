import { Injectable, signal, computed, effect } from '@angular/core';
import { Stock, StockUpdate } from '../models/stock';

export interface StockState {
  stocks: Map<string, Stock>;
  status: 'connected' | 'disconnected' | 'mock-mode' | 'loading';
  lastUpdated: number;
}

@Injectable({
  providedIn: 'root'
})
export class StockStore {
  private worker?: Worker;
  private mockInterval?: any;

  // --- PRIVATE STATE ---
  private readonly state = signal<StockState>({
    stocks: new Map(),
    status: 'loading',
    lastUpdated: Date.now()
  });

  // --- PUBLIC SELECTORS ---
  public readonly stocks = computed(() => Array.from(this.state().stocks.values()));
  public readonly status = computed(() => this.state().status);
  
  constructor() {
    this.init();
    effect(() => {
      this.persistActiveStates();
    });
  }

  private init() {
    this.initWorker();
  }

  /**
   * REQUIREMENT POINT 1 & 2: 
   * WebSocket Server Connection with Automatic Fallback to 
   * "Mocked implementation in an Angular service".
   */
  private initWorker() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../workers/stock.worker', import.meta.url));
      
      this.worker.onmessage = ({ data }) => {
        if (data.type === 'STATUS') {
          this.handleConnectionStatus(data.status);
        } else if (data.type === 'DATA') {
          this.handleUpdate(data.payload);
        }
      };

      this.worker.postMessage({ type: 'CONNECT', url: 'ws://localhost:8080' });
    } else {
      this.startInternalMockMode();
    }
  }

  private handleConnectionStatus(status: string) {
    if (status === 'connected') {
      this.stopInternalMockMode();
      this.state.update(s => ({ ...s, status: 'connected' }));
    } else {
      // If disconnected, give it a few seconds then fallback to internal mock
      this.state.update(s => ({ ...s, status: 'disconnected' }));
      setTimeout(() => {
        if (this.state().status === 'disconnected') {
          this.startInternalMockMode();
        }
      }, 3000);
    }
  }

  /**
   * "Mocked implementation in an Angular service which pushes stock prices to the UI"
   * This ensures the app works standalone if the server is down.
   */
  private startInternalMockMode() {
    if (this.mockInterval) return;
    
    console.log('--- STARTING INTERNAL ANGULAR MOCK MODE ---');
    this.state.update(s => ({ ...s, status: 'mock-mode' }));

    // Initialize with snapshot if empty
    if (this.state().stocks.size === 0) {
      this.handleUpdate({
        type: 'snapshot',
        data: [
          { s: 'AAPL', name: 'Apple Inc.', p: 232.98, high: 238.20, low: 198.40, h52: 230.00, l52: 170.00 },
          { s: 'GOOGL', name: 'Alphabet Inc.', p: 167.89, high: 188.00, low: 156.43, h52: 200.00, l52: 130.00 },
          { s: 'MSFT', name: 'Microsoft Corp.', p: 454.95, high: 456.30, low: 423.86, h52: 460.00, l52: 310.00 },
          { s: 'TSLA', name: 'Tesla Inc.', p: 196.82, high: 205.04, low: 184.75, h52: 290.00, l52: 150.00 }
        ]
      });
    }

    this.mockInterval = setInterval(() => {
      const symbols = Array.from(this.state().stocks.keys());
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      const current = this.state().stocks.get(randomSymbol);
      
      if (current && current.isActive) {
        const change = (Math.random() - 0.5) * 2;
        const newPrice = Number((current.price + change).toFixed(2));
        
        this.handleUpdate({
          type: 'trade',
          data: [{ s: randomSymbol, p: newPrice }]
        });
      }
    }, 1000);
  }

  private stopInternalMockMode() {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  public toggleStock(symbol: string) {
    this.state.update(s => {
      const newMap = new Map(s.stocks);
      const current = newMap.get(symbol);
      if (current) {
        newMap.set(symbol, { ...current, isActive: !current.isActive });
      }
      return { ...s, stocks: newMap };
    });
  }

  private handleUpdate(update: StockUpdate) {
    this.state.update(s => {
      const newMap = new Map(s.stocks);
      let changed = false;

      if (update.type === 'snapshot') {
        const saved = localStorage.getItem('stock_active_states');
        const activeStates = saved ? new Map<string, boolean>(JSON.parse(saved)) : null;

        update.data.forEach((item: any) => {
          const isActive = activeStates?.has(item.s) ? activeStates.get(item.s)! : true;
          const currentPrice = Number(item.p);
          
          newMap.set(item.s, {
            symbol: item.s,
            name: item.name,
            price: currentPrice,
            prevPrice: currentPrice,
            high: Number(item.high),
            low: Number(item.low),
            high52: Number(item.h52),
            low52: Number(item.l52),
            sessionStartPrice: currentPrice,
            history: [currentPrice],
            isActive: isActive
          });
        });
        changed = true;
      } else if (update.type === 'trade') {
        update.data.forEach((item: any) => {
          const existing = newMap.get(item.s);
          if (existing && existing.isActive) {
            const newPrice = Number(item.p);
            if (newPrice !== existing.price) {
              newMap.set(item.s, {
                ...existing,
                price: newPrice,
                prevPrice: existing.price,
                history: [...existing.history, newPrice].slice(-20),
                high: Math.max(existing.high, newPrice),
                low: Math.min(existing.low, newPrice),
                high52: Math.max(existing.high52, newPrice),
                low52: Math.min(existing.low52, newPrice)
              });
              changed = true;
            }
          }
        });
      }

      return changed ? { ...s, stocks: newMap, lastUpdated: Date.now() } : s;
    });
  }

  private persistActiveStates() {
    const states = Array.from(this.state().stocks.entries()).map(([sym, s]) => [sym, s.isActive]);
    localStorage.setItem('stock_active_states', JSON.stringify(states));
  }
}
