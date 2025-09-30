// RUN THIS IN BROWSER CONSOLE (F12) AFTER LOGIN
// Copy and paste this entire script into the browser console

console.log('=== DASHBOARD DIAGNOSTIC TEST ===\n');

// Test 1: Check if we're on the dashboard page
console.log('1. Current URL:', window.location.href);
const isDashboard = window.location.pathname.includes('dashboard');
console.log('   On dashboard page?', isDashboard ? '✅ YES' : '❌ NO');

// Test 2: Check if Angular is loaded
console.log('\n2. Angular Framework:');
const ngZone = window['ng'] ? '✅ Loaded' : '❌ Not loaded';
console.log('   Angular zone:', ngZone);

// Test 3: Check localStorage for auth data
console.log('\n3. Authentication Data in localStorage:');
const token = localStorage.getItem('auth_token');
const user = localStorage.getItem('auth_user');
const refreshToken = localStorage.getItem('refresh_token');

console.log('   auth_token:', token ? '✅ EXISTS (' + token.substring(0, 20) + '...)' : '❌ MISSING');
console.log('   auth_user:', user ? '✅ EXISTS' : '❌ MISSING');
console.log('   refresh_token:', refreshToken ? '✅ EXISTS' : '❌ MISSING');

if (user) {
  try {
    const userData = JSON.parse(user);
    console.log('   User data:', userData);
  } catch (e) {
    console.log('   ❌ User data is corrupted:', e.message);
  }
}

// Test 4: Check if dashboard component is rendered
console.log('\n4. Dashboard Component in DOM:');
const dashboardElement = document.querySelector('app-dashboard');
const hasDashboard = !!dashboardElement;
console.log('   <app-dashboard> element:', hasDashboard ? '✅ FOUND' : '❌ NOT FOUND');

if (dashboardElement) {
  console.log('   Dashboard HTML:', dashboardElement.innerHTML.substring(0, 100) + '...');
}

// Test 5: Check for dashboard content
console.log('\n5. Dashboard Content:');
const welcomeCard = document.querySelector('.welcome-card');
const actionCards = document.querySelectorAll('.action-card');
console.log('   Welcome card:', welcomeCard ? '✅ FOUND' : '❌ NOT FOUND');
console.log('   Action cards count:', actionCards.length);

// Test 6: Check for errors in console
console.log('\n6. Console Errors:');
const errors = [];
const originalError = console.error;
console.error = function(...args) {
  errors.push(args.join(' '));
  originalError.apply(console, args);
};
console.log('   Error tracking enabled. Refresh page to capture errors.');

// Test 7: Check Angular component state
console.log('\n7. Component State:');
try {
  if (window['ng'] && dashboardElement) {
    const component = window['ng'].getComponent(dashboardElement);
    if (component) {
      console.log('   ✅ Component instance found');
      console.log('   userName:', component.userName);
      console.log('   userEmail:', component.userEmail);
      console.log('   userRole:', component.userRole);
      console.log('   isAdmin:', component.isAdmin);
    } else {
      console.log('   ❌ Component instance not found');
    }
  }
} catch (e) {
  console.log('   ❌ Error accessing component:', e.message);
}

// Test 8: Check Material Design components
console.log('\n8. Material Design Components:');
const matCards = document.querySelectorAll('mat-card');
const matIcons = document.querySelectorAll('mat-icon');
console.log('   mat-card elements:', matCards.length, matCards.length > 0 ? '✅' : '❌');
console.log('   mat-icon elements:', matIcons.length, matIcons.length > 0 ? '✅' : '❌');

// Test 9: Check router state
console.log('\n9. Router State:');
const routerOutlet = document.querySelector('router-outlet');
console.log('   <router-outlet>:', routerOutlet ? '✅ FOUND' : '❌ NOT FOUND');

// Test 10: Network requests
console.log('\n10. To check network requests:');
console.log('   - Open Network tab (F12)');
console.log('   - Filter by "auth"');
console.log('   - Look for: POST /api/auth/login');
console.log('   - Check response: Should have "token", "user", "refreshToken"');

console.log('\n=== DIAGNOSTIC COMPLETE ===');
console.log('\n📋 SUMMARY:');
console.log('If you see ❌ for any test above, that\'s the problem!');
console.log('\nMost common issues:');
console.log('1. auth_token missing → Login failed');
console.log('2. <app-dashboard> not found → Routing problem');
console.log('3. Welcome card not found → Component not rendering');
console.log('4. mat-card count is 0 → Material modules not loaded');
