import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Stock, StockUpdate } from '../models/stock';

export interface StockState {
  stocks: Map<string, Stock>;
  status: 'connected' | 'disconnected' | 'reconnecting' | 'loading';
  lastUpdated: number;
}

@Injectable({
  providedIn: 'root'
})
export class StockStore {
  private http = inject(HttpClient);
  private worker?: Worker;

  // --- PRIVATE STATE ---
  private readonly state = signal<StockState>({
    stocks: new Map(),
    status: 'loading',
    lastUpdated: Date.now()
  });

  // --- PUBLIC SELECTORS (Computed Signals) ---
  public readonly stocks = computed(() => Array.from(this.state().stocks.values()));
  public readonly status = computed(() => this.state().status);
  public readonly lastUpdated = computed(() => this.state().lastUpdated);
  
  // Advanced Architect Selector: Calculate Market Breadth (Percentage of Upward stocks)
  public readonly marketBreadth = computed(() => {
    const list = this.stocks();
    if (list.length === 0) return 0;
    const up = list.filter(s => s.isActive && (s.sessionStartPrice ? s.price > s.sessionStartPrice : false)).length;
    return (up / list.length) * 100;
  });

  constructor() {
    this.init();
    
    // Auto-persistence of active states
    effect(() => {
      this.persistActiveStates();
    });
  }

  private init() {
    // 1. Fetch initial REST metadata
    this.state.update(s => ({ ...s, status: 'loading' }));
    
    this.http.get<any[]>('http://localhost:8080/api/stocks').subscribe({
      next: (data) => {
        const saved = localStorage.getItem('stock_active_states');
        const activeStates = saved ? new Map<string, boolean>(JSON.parse(saved)) : null;

        const newMap = new Map<string, Stock>();
        data.forEach(s => {
          const isActive = activeStates?.has(s.symbol) ? activeStates.get(s.symbol)! : true;
          newMap.set(s.symbol, {
            symbol: s.symbol,
            name: s.name,
            price: s.price,
            high: s.high,
            low: s.low,
            high52: s.h52,
            low52: s.l52,
            sessionStartPrice: s.price,
            history: [s.price],
            isActive: isActive
          });
        });

        this.state.update(s => ({ ...s, stocks: newMap }));
        this.initWorker();
      },
      error: (err) => {
        console.error('BFF REST failure:', err);
        this.initWorker(); // Try to connect anyway
      }
    });
  }

  private initWorker() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../workers/stock.worker', import.meta.url));
      
      this.worker.onmessage = ({ data }) => {
        if (data.type === 'STATUS') {
          this.state.update(s => ({ ...s, status: data.status }));
        } else if (data.type === 'DATA') {
          this.handleUpdate(data.payload);
        }
      };

      this.worker.postMessage({ type: 'CONNECT', url: 'ws://localhost:8080' });
    } else {
      console.warn('Web Workers not supported in this environment.');
      this.state.update(s => ({ ...s, status: 'disconnected' }));
    }
  }

  // --- ACTIONS ---
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
    if (update.type === 'snapshot') {
      this.state.update(s => {
        const newMap = new Map(s.stocks);
        update.data.forEach((item: any) => {
          const existing = newMap.get(item.s);
          const currentPrice = Number(item.p);
          newMap.set(item.s, {
            symbol: item.s,
            name: item.name || existing?.name || item.s,
            price: currentPrice,
            high: Number(item.high || Math.max(existing?.high || 0, currentPrice)),
            low: Number(item.low || Math.min(existing?.low || 1000000, currentPrice)),
            high52: Number(item.h52 || existing?.high52 || 0),
            low52: Number(item.l52 || existing?.low52 || 0),
            sessionStartPrice: existing?.sessionStartPrice ?? currentPrice,
            history: existing ? existing.history : [currentPrice],
            isActive: existing ? existing.isActive : true
          });
        });
        return { ...s, stocks: newMap, lastUpdated: Date.now() };
      });
    } else if (update.type === 'trade') {
      this.state.update(s => {
        const newMap = new Map(s.stocks);
        let changed = false;
        update.data.forEach((item: any) => {
          const existing = newMap.get(item.s);
          if (existing && existing.isActive) {
            newMap.set(item.s, {
              ...existing,
              price: item.p,
              prevPrice: existing.price,
              history: [...existing.history, item.p].slice(-20), // Advanced: Micro-Trend History (Keep last 20 ticks)
              high: Math.max(existing.high, item.p),
              low: Math.min(existing.low, item.p)
            });
            changed = true;
          }
        });
        return changed ? { ...s, stocks: newMap, lastUpdated: Date.now() } : s;
      });
    }
  }

  private persistActiveStates() {
    const states = Array.from(this.state().stocks.entries()).map(([sym, s]) => [sym, s.isActive]);
    localStorage.setItem('stock_active_states', JSON.stringify(states));
  }
}
