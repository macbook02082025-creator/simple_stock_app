export interface Stock {
  symbol: string;
  name: string;
  price: number;
  high: number;
  low: number;
  high52: number;
  low52: number;
  prevPrice?: number;
  sessionStartPrice?: number;
  history: number[]; // Advanced: Store recent data points for micro-trend (Sparkline)
  isActive: boolean;
}

export type StockUpdateType = 'trade' | 'snapshot';

export interface StockUpdate {
  type: StockUpdateType;
  data: any;
}
