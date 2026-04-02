import { Component, Output, EventEmitter, ChangeDetectionStrategy, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Stock } from '../../models/stock';

@Component({
  selector: 'app-stock-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stock-card" [ngClass]="cardStatus()">
      <div class="card-header">
        <span class="stock-name">{{ stock().name }}</span>
        <label class="toggle-switch">
          <input type="checkbox" [checked]="stock().isActive" (change)="onToggle()">
          <span class="slider"></span>
        </label>
      </div>
      
      <div class="card-body">
        <div class="price-section">
          <div class="symbol-tag">{{ stock().symbol }}</div>
          <div class="price-row">
            <span class="currency">$</span>
            <span class="current-price">{{ stock().price | number:'1.2-2' }}</span>
            
            <!-- REQ: Reactive indicator and delta based on latest tick -->
            <div class="trend-indicator" *ngIf="stock().isActive && priceTrend() !== ''">
              <span class="arrow">{{ priceTrend() === 'up' ? '▲' : '▼' }}</span>
              <span class="delta">{{ Math.abs(tickChange()) | number:'1.2-2' }}</span>
            </div>
          </div>
        </div>

        <div class="metrics-container">
          <div class="metric-item">
            <span class="metric-label">Day High</span>
            <span class="metric-value">{{ stock().high | currency }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Day Low</span>
            <span class="metric-value">{{ stock().low | currency }}</span>
          </div>
          
          <!-- REQ: Responsive fields (Desktop only) -->
          @if (isDesktop()) {
            <div class="metric-item">
              <span class="metric-label">52W High</span>
              <span class="metric-value">{{ stock().high52 | currency }}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">52W Low</span>
              <span class="metric-value">{{ stock().low52 | currency }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stock-card {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid #e2e8f0;
      transition: background-color 0.2s ease, border-color 0.2s ease;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    /* REQ: Full card background colors */
    .stock-card.up { background-color: #f0fdf4; border-color: #bbf7d0; color: #166534; }
    .stock-card.down { background-color: #fef2f2; border-color: #fecaca; color: #991b1b; }
    .stock-card.off { background-color: #f8fafc; border-color: #e2e8f0; opacity: 0.6; filter: grayscale(1); color: #64748b; }

    .card-header { display: flex; justify-content: space-between; align-items: center; }
    .stock-name { font-weight: 700; font-size: 1.1rem; letter-spacing: -0.01em; }

    .symbol-tag {
      font-size: 0.65rem;
      font-weight: 800;
      background: rgba(0,0,0,0.05);
      padding: 2px 6px;
      border-radius: 4px;
      width: fit-content;
      margin-bottom: 0.5rem;
    }

    .price-row { display: flex; align-items: baseline; gap: 4px; }
    .currency { font-size: 1.25rem; font-weight: 600; opacity: 0.7; }
    .current-price { font-size: 2.25rem; font-weight: 800; letter-spacing: -0.02em; }

    .trend-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: 12px;
      font-weight: 700;
      font-size: 0.9rem;
    }

    .metrics-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(0,0,0,0.05);
    }

    .metric-item { display: flex; flex-direction: column; gap: 2px; }
    .metric-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; opacity: 0.6; }
    .metric-value { font-size: 0.95rem; font-weight: 600; }

    /* Toggle Switch */
    .toggle-switch { position: relative; display: inline-block; width: 40px; height: 20px; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
      background-color: #cbd5e1; transition: .3s; border-radius: 20px;
    }
    .slider:before {
      position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px;
      background-color: white; transition: .3s; border-radius: 50%;
    }
    input:checked + .slider { background-color: #1e293b; }
    input:checked + .slider:before { transform: translateX(20px); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockCardComponent {
  stock = input.required<Stock>();
  @Output() toggle = new EventEmitter<string>();

  protected readonly Math = Math;
  private isDesktopSignal = signal(window.innerWidth > 768);

  constructor() {
    window.addEventListener('resize', () => {
      this.isDesktopSignal.set(window.innerWidth > 768);
    });
  }

  isDesktop = computed(() => this.isDesktopSignal());

  // REQ: Reactive card status based on latest price increase/decrease
  cardStatus = computed(() => {
    const s = this.stock();
    if (!s.isActive) return { 'off': true };
    const trend = this.priceTrend();
    return {
      'up': trend === 'up',
      'down': trend === 'down'
    };
  });

  priceTrend = computed(() => {
    const s = this.stock();
    if (!s.isActive || !s.prevPrice || s.price === s.prevPrice) return '';
    return s.price > s.prevPrice ? 'up' : 'down';
  });

  tickChange = computed(() => {
    const s = this.stock();
    return s.price - (s.prevPrice ?? s.price);
  });

  onToggle() {
    this.toggle.emit(this.stock().symbol);
  }
}
