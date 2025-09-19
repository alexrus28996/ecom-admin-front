import { Component } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({ selector: 'app-toasts', template: `
  <div style="position:fixed;top:12px;right:12px;display:flex;flex-direction:column;gap:8px;z-index:9999;">
    <div *ngFor="let t of toast.toasts$ | async" [ngStyle]="style(t.type)" (click)="toast.dismiss(t.id)">
      {{ t.message }}
    </div>
  </div>
`, standalone: false })
export class ToastsComponent {
  constructor(public toast: ToastService) {}
  style(type: 'success'|'error'|'info') {
    const base = { padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', color: '#fff', minWidth: '220px', boxShadow: '0 2px 8px rgba(0,0,0,0.35)'} as any;
    if (type === 'success') return { ...base, background: '#16a34a' };
    if (type === 'error') return { ...base, background: '#ef4444' };
    return { ...base, background: '#2563eb' };
  }
}

