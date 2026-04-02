import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockStore } from '../../services/stock.store';
import { StockCardComponent } from '../stock-card/stock-card.component';

@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [CommonModule, StockCardComponent],
  template: `
    <div class="dashboard-wrapper">
      <nav class="top-nav">
        <div class="brand">
          <span class="logo">Σ</span>
          <h1>StockEngine <span class="version">v2.0</span></h1>
        </div>
        
        <div class="market-stats">
          <div class="stat">
            <span class="label">Market Breadth</span>
            <div class="breadth-bar">
              <div class="fill" [style.width.%]="store.marketBreadth()"></div>
            </div>
            <span class="value">{{ store.marketBreadth() | number:'1.0-0' }}% Advancing</span>
          </div>
        </div>

        <div class="connection-status" [ngClass]="store.status()">
          <span class="dot"></span>
          {{ store.status() | uppercase }}
        </div>
      </nav>

      <main class="content">
        <div class="grid-header">
          <h2>Real-Time Monitor</h2>
          <span class="last-sync">Last update: {{ store.lastUpdated() | date:'HH:mm:ss' }}</span>
        </div>

        <div class="stock-grid">
          @for (stock of store.stocks(); track stock.symbol) {
            <app-stock-card 
              [stock]="stock" 
              (toggle)="store.toggleStock($event)">
            </app-stock-card>
          } @empty {
            <div class="empty-state">
              <div class="loader"></div>
              <p>Initializing high-frequency data streams...</p>
            </div>
          }
        </div>
      </main>

      <footer class="footer">
        <p>Architected with Angular Signals & Web Workers for sub-millisecond latency.</p>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      color: #1a202c;
    }

    .dashboard-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .top-nav {
      background: white;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo {
      background: #4a5568;
      color: white;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      font-weight: bold;
      font-size: 1.2rem;
    }

    h1 {
      font-size: 1.25rem;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.025em;
    }

    .version {
      font-size: 0.7rem;
      background: #edf2f7;
      padding: 2px 6px;
      border-radius: 4px;
      color: #718096;
      vertical-align: middle;
    }

    .market-stats {
      flex: 1;
      max-width: 400px;
      margin: 0 3rem;
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .stat .label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #a0aec0;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .breadth-bar {
      flex: 1;
      height: 6px;
      background: #edf2f7;
      border-radius: 3px;
      overflow: hidden;
    }

    .breadth-bar .fill {
      height: 100%;
      background: #48bb78;
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .stat .value {
      font-size: 0.8rem;
      font-weight: 600;
      color: #4a5568;
      white-space: nowrap;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 20px;
      background: #f7fafc;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #cbd5e0;
    }

    .connection-status.connected { color: #2f855a; background: #f0fff4; }
    .connection-status.connected .dot { background: #48bb78; box-shadow: 0 0 0 4px rgba(72, 187, 120, 0.2); }
    
    .connection-status.loading { color: #c05621; background: #fffaf0; }
    .connection-status.loading .dot { background: #ed8936; }

    .content {
      flex: 1;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
      padding: 2rem;
    }

    .grid-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 2rem;
    }

    h2 {
      font-size: 1.875rem;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.025em;
    }

    .last-sync {
      font-size: 0.875rem;
      color: #a0aec0;
    }

    .stock-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .empty-state {
      grid-column: 1 / -1;
      padding: 10rem 0;
      text-align: center;
      color: #a0aec0;
    }

    .loader {
      width: 40px;
      height: 40px;
      border: 3px solid #edf2f7;
      border-top-color: #4a5568;
      border-radius: 50%;
      margin: 0 auto 1.5rem;
      animation: spin 1s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .footer {
      padding: 2rem;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      color: #a0aec0;
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .top-nav { padding: 1rem; }
      .market-stats { display: none; }
      .content { padding: 1rem; }
    }
  `]
})
export class StockListComponent {
  public store = inject(StockStore);
}
