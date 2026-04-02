import { Component, Output, EventEmitter, ChangeDetectionStrategy, computed, input, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Stock } from '../../models/stock';

@Component({
  selector: 'app-stock-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stock-card" [ngClass]="cardStatus()">
      <div class="card-header">
        <div class="identity">
          <span class="symbol">{{ stock().symbol }}</span>
          <span class="name">{{ stock().name }}</span>
        </div>
        <div class="actions">
          <label class="toggle-switch" title="Toggle real-time stream">
            <input type="checkbox" [checked]="stock().isActive" (change)="onToggle()">
            <span class="slider"></span>
          </label>
        </div>
      </div>
      
      <div class="card-body">
        <div class="price-container" [ngClass]="priceTrend()" aria-live="polite" [attr.aria-label]="'Current price of ' + stock().symbol + ' is ' + (stock().price | number:'1.2-2')">
          <span class="currency">$</span>
          <span class="price">{{ stock().price | number:'1.2-2' }}</span>
          
          <div class="delta-indicators" *ngIf="stock().isActive && stock().sessionStartPrice">
            <span class="indicator">{{ priceIndicator() }}</span>
            <span class="change-value">{{ Math.abs(priceChange()) | number:'1.2-2' }} ({{ Math.abs(priceChangePercent()) | number:'1.2-2' }}%)</span>
          </div>
        </div>

        <!-- Advanced Architect Feature: Sparkline Micro-Trend History -->
        <div class="sparkline-container" *ngIf="stock().isActive && stock().history && stock().history.length > 1">
          <svg viewBox="0 -2 100 34" preserveAspectRatio="none">
            <path [attr.d]="sparklinePath()" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" [attr.stroke]="priceTrend() === 'up' ? '#48bb78' : (priceTrend() === 'down' ? '#f56565' : '#cbd5e0')" />
          </svg>
        </div>

        <div class="metrics-grid">
          <div class="metric">
            <span class="label">Day High</span>
            <span class="value">{{ stock().high | currency }}</span>
          </div>
          <div class="metric">
            <span class="label">Day Low</span>
            <span class="value">{{ stock().low | currency }}</span>
          </div>
          
          <div class="metric desktop-only">
            <span class="label">52W High</span>
            <span class="value">{{ stock().high52 | currency }}</span>
          </div>
          <div class="metric desktop-only">
            <span class="label">52W Low</span>
            <span class="value">{{ stock().low52 | currency }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stock-card {
      position: relative;
      background: white;
      border-radius: 20px;
      padding: 1.5rem;
      border: 1px solid #e2e8f0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .stock-card:hover {
      border-color: #cbd5e0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      transform: translateY(-2px);
    }

    .stock-card.up {
      background: #f0fff4;
      border-color: #48bb78;
    }

    .stock-card.down {
      background: #fff5f5;
      border-color: #f56565;
    }

    .stock-card.off {
      background: #f7fafc;
      opacity: 0.7;
      filter: grayscale(1);
      border-color: #e2e8f0;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .identity {
      display: flex;
      flex-direction: column;
    }

    .symbol {
      font-size: 0.75rem;
      font-weight: 800;
      color: #718096;
      background: #edf2f7;
      padding: 2px 8px;
      border-radius: 6px;
      width: fit-content;
      margin-bottom: 4px;
    }

    .name {
      font-weight: 700;
      font-size: 1.1rem;
      color: #2d3748;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
    }

    .price-container {
      display: flex;
      align-items: baseline;
      gap: 4px;
      transition: color 0.3s ease;
    }

    .currency {
      font-size: 1.2rem;
      font-weight: 600;
      color: #a0aec0;
    }

    .price {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.05em;
      color: #1a202c;
      transition: transform 0.1s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .up .price { transform: scale(1.02); }
    .down .price { transform: scale(0.98); }

    .delta-indicators {
      display: flex;
      flex-direction: column;
      margin-left: 8px;
    }

    .indicator {
      font-size: 1.2rem;
    }

    .change-value {
      font-size: 0.75rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .up .price, .up .change-value { color: #2f855a; }
    .up .indicator { color: #48bb78; }
    
    .down .price, .down .change-value { color: #c53030; }
    .down .indicator { color: #f56565; }

    .sparkline-container {
      width: 100%;
      height: 40px;
      margin: 0.5rem 0;
      opacity: 0.7;
    }
    
    .sparkline-container svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .metric {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .label {
      font-size: 0.65rem;
      font-weight: 700;
      color: #a0aec0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .value {
      font-size: 0.9rem;
      font-weight: 600;
      color: #4a5568;
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 20px;
    }

    .toggle-switch input { opacity: 0; width: 0; height: 0; }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #e2e8f0;
      transition: .4s;
      border-radius: 20px;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }

    input:checked + .slider { background-color: #4a5568; }
    input:checked + .slider:before { transform: translateX(20px); }

    /* Pulse effect on the entire card */
    .stock-card::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.4s ease-out;
      z-index: 1;
    }

    .pulse-up::after {
      background: rgba(72, 187, 120, 0.15);
      opacity: 1;
      transition: none; /* Instant on */
    }

    .pulse-down::after {
      background: rgba(245, 101, 101, 0.15);
      opacity: 1;
      transition: none; /* Instant on */
    }

    /* Magnitudes */
    .pulse-medium::after { opacity: 0.25; }
    .pulse-large::after { opacity: 0.4; background: rgba(72, 187, 120, 0.4); }
    .pulse-large.pulse-down::after { background: rgba(245, 101, 101, 0.4); }

    @media (max-width: 768px) {
      .desktop-only { display: none; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockCardComponent {
  protected readonly Math = Math;
  stock = input.required<Stock>();
  @Output() toggle = new EventEmitter<string>();

  private pulseState = signal<string | null>(null);

  constructor() {
    // Advanced: Re-trigger pulse animation on every price update
    effect(() => {
      const s = this.stock();
      if (s.isActive && s.prevPrice && s.price !== s.prevPrice) {
        const direction = s.price > s.prevPrice ? 'pulse-up' : 'pulse-down';
        
        // Calculate magnitude (1-3) based on percent change
        const pct = Math.abs(((s.price - s.prevPrice) / s.prevPrice) * 100);
        const magnitude = pct > 0.5 ? 'large' : (pct > 0.1 ? 'medium' : 'small');
        
        this.pulseState.set(`${direction} ${magnitude}`);
        
        // Reset after a frame
        setTimeout(() => this.pulseState.set(null), 50);
      }
    });
  }

  cardStatus = computed(() => {
    const s = this.stock();
    const pulse = this.pulseState() || '';
    if (!s.isActive) return { 'off': true };
    
    const trend = this.priceTrend();
    
    return {
      'up': trend === 'up',
      'down': trend === 'down',
      'pulse-up': pulse.includes('pulse-up'),
      'pulse-down': pulse.includes('pulse-down'),
      'pulse-small': pulse.includes('small'),
      'pulse-medium': pulse.includes('medium'),
      'pulse-large': pulse.includes('large')
    };
  });

  priceTrend = computed(() => {
    const s = this.stock();
    if (!s.isActive || !s.sessionStartPrice) return '';
    // Use a small epsilon to avoid flickering on tiny floating point differences
    const diff = s.price - s.sessionStartPrice;
    if (diff > 0.0001) return 'up';
    if (diff < -0.0001) return 'down';
    return '';
  });

  priceIndicator = computed(() => {
    const trend = this.priceTrend();
    if (trend === 'up') return '▲';
    if (trend === 'down') return '▼';
    return '';
  });

  onToggle() {
    this.toggle.emit(this.stock().symbol);
  }

  priceChange = computed(() => {
    const s = this.stock();
    if (!s.sessionStartPrice) return 0;
    return s.price - s.sessionStartPrice;
  });

  priceChangePercent = computed(() => {
    const s = this.stock();
    if (!s.sessionStartPrice || s.sessionStartPrice === 0) return 0;
    return ((s.price - s.sessionStartPrice) / s.sessionStartPrice) * 100;
  });

  // Advanced Architect Feature: Calculate SVG path for Sparkline
  sparklinePath = computed(() => {
    const history = this.stock().history || [];
    if (history.length < 2) return '';
    
    const max = Math.max(...history);
    const min = Math.min(...history);
    const range = max - min || 1; // Avoid division by zero
    
    const width = 100;
    const height = 30; // Matches viewBox height
    
    const stepX = width / (history.length - 1);
    
    const points = history.map((val, i) => {
      const x = i * stepX;
      const y = height - ((val - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    
    return points.join(' ');
  });
}
