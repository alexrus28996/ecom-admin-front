import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class ToastService {
  constructor(private snack: MatSnackBar) {}
  success(message: string) { this.snack.open(message, 'OK', { duration: 2500, panelClass: ['bg-green-600','text-white']}); }
  error(message: string) { this.snack.open(message, 'OK', { duration: 3500, panelClass: ['bg-red-600','text-white']}); }
  info(message: string) { this.snack.open(message, 'OK', { duration: 2500 }); }
}
