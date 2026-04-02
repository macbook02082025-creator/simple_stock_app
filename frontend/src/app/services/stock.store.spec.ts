import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { StockStore } from './stock.store';
import { Stock } from '../models/stock';

describe('StockStore', () => {
  let store: StockStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StockStore,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideZonelessChangeDetection()
      ]
    });

    store = TestBed.inject(StockStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    if (httpMock) {
      httpMock.verify();
    }
  });

  it('should be created and handle initial REST call', () => {
    const req = httpMock.expectOne('http://localhost:8080/api/stocks');
    req.flush([]);
    expect(store).toBeTruthy();
  });

  it('should load initial stocks via REST', () => {
    const mockStocks = [
      { symbol: 'AAPL', name: 'Apple', price: 150, high: 155, low: 145, h52: 180, l52: 120 }
    ];

    const req = httpMock.expectOne('http://localhost:8080/api/stocks');
    expect(req.request.method).toBe('GET');
    req.flush(mockStocks);

    const stocks = store.stocks();
    expect(stocks.length).toBe(1);
    expect(stocks[0].symbol).toBe('AAPL');
    expect(stocks[0].isActive).toBeTrue();
  });

  it('should toggle stock active state', () => {
    const mockStocks = [
      { symbol: 'AAPL', name: 'Apple', price: 150, high: 155, low: 145, h52: 180, l52: 120 }
    ];
    
    // Flush initial data
    const req = httpMock.expectOne('http://localhost:8080/api/stocks');
    req.flush(mockStocks);

    expect(store.stocks()[0].isActive).toBeTrue();
    
    store.toggleStock('AAPL');
    expect(store.stocks()[0].isActive).toBeFalse();
    
    store.toggleStock('AAPL');
    expect(store.stocks()[0].isActive).toBeTrue();
  });

  it('should calculate market breadth correctly', () => {
    const mockStocks = [
      { symbol: 'AAPL', name: 'Apple', price: 155, high: 160, low: 150, h52: 180, l52: 120 }
    ];
    
    const req = httpMock.expectOne('http://localhost:8080/api/stocks');
    req.flush(mockStocks);

    // Initially, breadth is 0 because no prevPrice exists
    expect(store.marketBreadth()).toBe(0);

    // Simulate a price increase
    (store as any).handleUpdate({
      type: 'trade',
      data: [{ s: 'AAPL', p: 160 }]
    });

    expect(store.marketBreadth()).toBe(100);
  });
});
