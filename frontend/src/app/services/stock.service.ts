import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Stock, StockUpdate } from '../models/stock';

@Injectable({
  providedIn: 'root'
})
export class StockService {
  private http = inject(HttpClient);
  private socket?: WebSocket;
  private isMockMode = false;
  private mockInterval?: any;

  // Signal for current stock states
  private stocksSignal = signal<Map<string, Stock>>(new Map());

  // Computed signal for easy consumption as an array
  public stocks = computed(() => Array.from(this.stocksSignal().values()));

  // Connection status signal
  public connectionStatus = signal<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  constructor() {
    this.loadState();
    
    effect(() => {
      this.saveState();
    });
  }

  public connect(url: string = 'ws://localhost:8080'): void {
    if (this.isMockMode) return;

    // First, fetch metadata via traditional REST API call (visible in Network tab)
    this.http.get<any[]>('http://localhost:8080/api/stocks').subscribe({
      next: (data) => {
        const newMap = new Map<string, Stock>();
        data.forEach(s => {
          const isActive = this.initialActiveStates.has(s.symbol) 
            ? this.initialActiveStates.get(s.symbol)! 
            : true;

          newMap.set(s.symbol, {
            symbol: s.symbol,
            name: s.name,
            price: s.price,
            high: s.high,
            low: s.low,
            high52: s.h52,
            low52: s.l52,
            history: [s.price],
            isActive: isActive
          });
        });
        this.stocksSignal.set(newMap);
        
        // After REST call succeeds, start WebSocket for real-time streaming
        this.establishWebSocket(url);
      },
      error: (err) => {
        console.error('Failed to fetch initial stock data via REST:', err);
        // Fallback to WebSocket only if REST fails
        this.establishWebSocket(url);
      }
    });
  }

  private establishWebSocket(url: string): void {
    this.connectionStatus.set('reconnecting');
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('Connected to Stock Server WebSocket');
      this.connectionStatus.set('connected');
    };

    this.socket.onmessage = (event) => {
      const update: StockUpdate = JSON.parse(event.data);
      this.handleUpdate(update);
    };

    this.socket.onclose = () => {
      this.connectionStatus.set('disconnected');
      setTimeout(() => this.establishWebSocket(url), 3000);
    };
  }

  public enableMockMode(): void {
    this.isMockMode = true;
    if (this.socket) this.socket.close();
    
    this.mockInterval = setInterval(() => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const currentStock = this.stocksSignal().get(symbol);
      
      if (currentStock && currentStock.isActive) {
        const change = (Math.random() - 0.5) * 2;
        const newPrice = parseFloat((currentStock.price + change).toFixed(2));
        
        this.updateStock(symbol, {
          price: newPrice,
          prevPrice: currentStock.price,
          high: Math.max(currentStock.high, newPrice),
          low: Math.min(currentStock.low, newPrice)
        });
      }
    }, 1000);
  }

  public toggleStock(symbol: string): void {
    const stock = this.stocksSignal().get(symbol);
    if (stock) {
      this.updateStock(symbol, { isActive: !stock.isActive });
    }
  }

  private handleUpdate(update: StockUpdate): void {
    if (update.type === 'snapshot') {
      // Snapshot is still useful for immediate consistency
      const newMap = new Map(this.stocksSignal());
      update.data.forEach((s: any) => {
        const existing = newMap.get(s.s);
        newMap.set(s.s, {
          symbol: s.s,
          name: s.name,
          price: s.p,
          high: s.high,
          low: s.low,
          high52: s.h52,
          low52: s.l52,
          history: existing ? existing.history : [s.p],
          isActive: existing ? existing.isActive : true
        });
      });
      this.stocksSignal.set(newMap);
    } else if (update.type === 'trade') {
      update.data.forEach((s: any) => {
        const current = this.stocksSignal().get(s.s);
        if (current && current.isActive) {
          this.updateStock(s.s, {
            price: s.p,
            prevPrice: current.price,
            high: s.high || Math.max(current.high, s.p),
            low: s.low || Math.min(current.low, s.p)
          });
        }
      });
    }
  }

  private updateStock(symbol: string, partial: Partial<Stock>): void {
    const newMap = new Map(this.stocksSignal());
    const current = newMap.get(symbol);
    if (current) {
      newMap.set(symbol, { ...current, ...partial });
      this.stocksSignal.set(newMap);
    }
  }

  private saveState(): void {
    const states = Array.from(this.stocksSignal().entries()).map(([sym, s]) => [sym, s.isActive]);
    localStorage.setItem('stock_active_states', JSON.stringify(states));
  }

  private loadState(): void {
    const saved = localStorage.getItem('stock_active_states');
    if (saved) {
      this.initialActiveStates = new Map<string, boolean>(JSON.parse(saved));
    }
  }

  private initialActiveStates = new Map<string, boolean>();
}
