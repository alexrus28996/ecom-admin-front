import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <div class="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600">
      <h1 class="text-6xl font-bold text-white">Hello World</h1>
    </div>
  `
})
export class AppComponent {}
