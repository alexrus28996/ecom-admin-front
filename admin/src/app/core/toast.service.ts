import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast { id: number; type: 'success'|'error'|'info'; message: string; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  private seq = 1;
  private _toasts$ = new BehaviorSubject<Toast[]>([]);
  toasts$ = this._toasts$.asObservable();

  show(message: string, type: Toast['type']='info', ttlMs = 3000) {
    const id = this.seq++;
    const t: Toast = { id, type, message };
    const list = [...this._toasts$.value, t];
    this._toasts$.next(list);
    setTimeout(() => this.dismiss(id), ttlMs);
  }

  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string) { this.show(msg, 'error', 5000); }

  dismiss(id: number) { this._toasts$.next(this._toasts$.value.filter(t => t.id !== id)); }
}

