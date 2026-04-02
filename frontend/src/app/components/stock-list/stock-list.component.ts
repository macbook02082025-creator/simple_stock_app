import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockStore } from '../../services/stock.store';
import { StockCardComponent } from '../stock-card/stock-card.component';

@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [CommonModule, StockCardComponent],
  template: `
    <div class="dashboard-container">
      <header class="header">
        <div class="brand">
          <h1>StockMonitor</h1>
        </div>
        <div class="status-badge" [ngClass]="store.status()">
          {{ store.status() | uppercase }}
        </div>
      </header>

      <main class="main-content">
        <div class="stock-grid">
          @for (stock of store.stocks(); track stock.symbol) {
            <app-stock-card 
              [stock]="stock" 
              (toggle)="store.toggleStock($event)">
            </app-stock-card>
          } @empty {
            <div class="loading-state">
              <p>Connecting to data stream...</p>
            </div>
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 3rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e2e8f0;
    }

    h1 {
      font-size: 1.5rem;
      font-weight: 800;
      margin: 0;
      color: #0f172a;
    }

    .status-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 99px;
      background: #f1f5f9;
      color: #64748b;
    }

    .status-badge.connected {
      background: #dcfce7;
      color: #166534;
    }

    .stock-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }

    .loading-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 5rem;
      color: #94a3b8;
    }

    @media (max-width: 640px) {
      .dashboard-container { padding: 1rem; }
      .header { margin-bottom: 2rem; }
      .stock-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class StockListComponent {
  public store = inject(StockStore);
}
