import { Component } from '@angular/core';
import { StockListComponent } from './components/stock-list/stock-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [StockListComponent],
  template: `<app-stock-list></app-stock-list>`,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background-color: #f5f5f7;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
  `]
})
export class AppComponent {}
