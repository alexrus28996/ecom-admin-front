# STEP-BY-STEP DASHBOARD TEST

## BEFORE YOU START

**Your Angular server IS RUNNING on port 4200**
Process ID: Check with `netstat -ano | findstr :4200`

---

## STEP 1: Open Browser

1. Open Chrome or Edge
2. Press F12 to open Developer Tools
3. Go to: **http://localhost:4200**

**Expected:** You should see the login page
**If not:** Server not running. Check terminal.

---

## STEP 2: Check Console (Before Login)

In the Console tab, you should see:
- No red errors
- Maybe some Angular debug messages

**Take screenshot if you see RED errors**

---

## STEP 3: Login

1. Go to: **http://localhost:4200/login**
2. Enter:
   - Email: (your admin email)
   - Password: (your password)
3. Click "Login" button
4. **WATCH THE CONSOLE** for messages

**Expected console output:**
```
[Auth] Login request {email: "..."}
[Auth] Login response {token: "...", user: {...}}
[LoginComponent] Login successful, navigating to dashboard
```

**If you see these ✅ → Login worked**
**If you DON'T see these ❌ → Login failed**

---

## STEP 4: Check Network Tab

1. Open Network tab in DevTools (F12)
2. Filter by: `auth`
3. Look for: `POST` request to `auth/login`

Click on it and check:
- **Status:** Should be `200 OK`
- **Response tab:** Should show JSON with:
  ```json
  {
    "token": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "user": {
      "name": "Your Name",
      "email": "your@email.com",
      "roles": ["admin"],
      "isActive": true
    }
  }
  ```

**If response is different → Backend problem**

---

## STEP 5: Check URL

After clicking Login, check the browser URL bar:

**Expected:** `http://localhost:4200/dashboard`
**If still on `/login` → Navigation failed**

---

## STEP 6: Check localStorage

In Console tab, type:
```javascript
localStorage.getItem('auth_token')
```

**Expected:** Should return a long string (JWT token)
**If null → Login didn't save token**

Type:
```javascript
localStorage.getItem('auth_user')
```

**Expected:** Should return JSON string with user data
**If null → Login didn't save user**

---

## STEP 7: Run Diagnostic Script

1. Copy the entire content of `DIAGNOSTIC_TEST.js`
2. Paste into Console tab
3. Press Enter
4. Read the output

**The script will tell you EXACTLY what's wrong**

---

## STEP 8: Check Elements Tab

1. Go to Elements tab in DevTools
2. Press Ctrl+F to search
3. Search for: `app-dashboard`

**Expected:** Should find `<app-dashboard>` element with content inside
**If not found → Component not loading**

Search for: `welcome-card`

**Expected:** Should find element with class `welcome-card`
**If not found → Template not rendering**

---

## STEP 9: Check for Visible Content

Look at the actual browser page (not DevTools).

**You should see:**
- Purple gradient header with "Welcome, [Your Name]!"
- Your email address
- Your role
- Admin access (Yes/No)
- 4 cards below (Profile, Products, Orders, Users - depending on admin status)

**If page is blank:**
- Check Console for errors
- Check Elements tab to see if HTML exists but not visible
- Check if any CSS is blocking visibility

---

## STEP 10: Component State Check

In Console, type:
```javascript
const dashboard = document.querySelector('app-dashboard');
const component = ng.getComponent(dashboard);
console.log(component);
```

**Expected output:**
```javascript
{
  userName: "Your Name",
  userEmail: "your@email.com",
  userRole: "admin",
  isAdmin: true
}
```

**If component is null → Angular didn't initialize component**

---

## COMMON PROBLEMS & SOLUTIONS

### Problem 1: Login API returns 401 or 500
**Solution:** Backend issue. Check backend server logs.

### Problem 2: Login API returns 200 but no `user` in response
**Solution:** Backend not returning user data. Check API.md spec.

### Problem 3: Token saved but dashboard not showing
**Solution:**
- Check AuthGuard is not blocking
- Check router configuration
- Type in Console: `window.location.href = 'http://localhost:4200/dashboard'`

### Problem 4: Dashboard URL loads but page is blank
**Solution:**
- Check Console for Angular errors
- Check if Material modules are loaded
- Check if dashboard.component.ts has compilation errors

### Problem 5: "Cannot read property 'name' of null"
**Solution:** AuthService.user is null
- Login didn't persist user data
- Check persistSession() in auth.service.ts

### Problem 6: Angular not loading at all
**Solution:**
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+F5)
- Check if server is actually running

---

## REPORTING THE ISSUE

After running all steps above, report:

1. **Screenshot of Console** (with any errors)
2. **Screenshot of Network tab** showing `/auth/login` response
3. **Output of DIAGNOSTIC_TEST.js**
4. **localStorage values:**
   ```javascript
   console.log({
     token: localStorage.getItem('auth_token'),
     user: localStorage.getItem('auth_user'),
     refresh: localStorage.getItem('refresh_token')
   });
   ```

5. **Current URL after login attempt**
6. **What you see on screen** (blank? error? something else?)

---

## EMERGENCY FIX

If nothing works, try this:

1. **Clear everything:**
```javascript
localStorage.clear();
sessionStorage.clear();
```

2. **Hard refresh:** Ctrl+Shift+R

3. **Re-login**

4. **If still fails, restart both servers:**
```bash
# Stop frontend (Ctrl+C in terminal)
# Stop backend (Ctrl+C in terminal)

# Start backend first
cd backend
npm start

# Start frontend
cd admin
npm start
```

---

## FILES TO CHECK

If tests show dashboard component exists but doesn't render:

1. `dashboard.component.ts` - Should be 24 lines, very simple
2. `dashboard.component.html` - Should have `<div class="dashboard">`
3. `dashboard.component.scss` - Should have `.welcome-card` styles
4. `app.module.ts` - Should declare `DashboardComponent`
5. `app.routing.ts` - Should have route `{ path: 'dashboard', component: DashboardComponent }`

---

## SUCCESS CRITERIA

✅ Console shows login success messages
✅ URL changes to `/dashboard`
✅ localStorage has `auth_token` and `auth_user`
✅ Page shows purple welcome card
✅ Your name and email are displayed
✅ Action cards are visible
✅ No errors in Console

**If ALL ✅ → Dashboard is working!**
