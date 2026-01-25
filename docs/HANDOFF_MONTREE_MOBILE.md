# MONTREE MOBILE - COMPLETE HANDOFF

**Date**: 2026-01-25
**Session**: 94 (ending) → 95 (new approach)
**Status**: PIVOTING TO VITE + REACT + CAPACITOR

---

## THE PROBLEM (SOLVED BY PIVOTING)

Next.js App Router + Capacitor static export = INFINITE RELOAD LOOP

**Root Cause**: Next.js client-side routing tries to fetch JSON data from 
`/_next/data/${BUILD_ID}/page.json` - paths that don't exist under Capacitor's 
`capacitor://` URL scheme.

**Why We Can't Fix It**:
- Next.js App Router is designed for server-side rendering
- Static export mode is an afterthought, not the primary use case
- The Ionic team (who created Capacitor) recommends Vite, not Next.js
- Service workers don't work on iOS Capacitor (WKWebView limitation)

---

## THE SOLUTION

**Create a NEW project: montree-mobile**
- Vite + React + TypeScript (no Next.js)
- Capacitor for iOS/Android
- Ionic components for native navigation
- SQLite for offline-first data storage
- Sync to existing Supabase backend

**The web version (teacherpotato.xyz) stays on Next.js - it works fine.**

---

## PROJECT STRUCTURE

```
/Users/tredouxwillemse/Desktop/ACTIVE/
├── whale/                    ← EXISTING - Web app (keep as-is)
│   └── (teacherpotato.xyz)
│
└── montree-mobile/           ← NEW - iOS/Android app
    ├── src/
    │   ├── components/       ← UI components
    │   ├── pages/            ← Screen components
    │   ├── db/               ← SQLite layer
    │   ├── lib/              ← Business logic
    │   └── App.tsx           ← Main app with routing
    ├── ios/                  ← Capacitor iOS project
    ├── android/              ← Capacitor Android project
    ├── capacitor.config.ts
    ├── vite.config.ts
    └── brain.json            ← NEW brain for mobile project
```

---

## STRICT WORK RULES

### RULE 1: SEGMENT EVERYTHING
Each task must be completable in under 5 minutes. If it takes longer, break it down further.

### RULE 2: UPDATE BRAIN AFTER EVERY STEP
```bash
# After EVERY completed step:
# 1. Update brain.json with checkpoint
# 2. Git commit if code changed
# 3. Test before moving on
```

### RULE 3: TEST BEFORE PROCEEDING
Never move to the next step until the current step is verified working.

### RULE 4: IF YOU GLITCH
1. Read this handoff document
2. Read brain.json
3. Check last checkpoint
4. Resume from there

---

## PHASE 1: PROJECT SETUP (6 steps, ~15 min)

### Step 1.1: Create Vite Project
```bash
cd /Users/tredouxwillemse/Desktop/ACTIVE
npm create vite@latest montree-mobile -- --template react-ts
```
**Checkpoint**: Directory exists with package.json
**Update brain**: "Step 1.1 complete - Vite project created"

### Step 1.2: Install Dependencies
```bash
cd montree-mobile
npm install
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @ionic/react @ionic/react-router ionicons
npm install react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
**Checkpoint**: All packages in node_modules
**Update brain**: "Step 1.2 complete - Dependencies installed"

### Step 1.3: Configure Tailwind
Create/update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Update `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
**Checkpoint**: Tailwind classes work in components
**Update brain**: "Step 1.3 complete - Tailwind configured"

### Step 1.4: Initialize Capacitor
```bash
npx cap init "Montree" "xyz.teacherpotato.montree" --web-dir=dist
npx cap add ios
```
**Checkpoint**: capacitor.config.ts exists, ios/ folder exists
**Update brain**: "Step 1.4 complete - Capacitor initialized"

### Step 1.5: Update capacitor.config.ts
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'xyz.teacherpotato.montree',
  appName: 'Montree',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  },
  ios: {
    contentInset: 'automatic'
  }
};

export default config;
```
**Checkpoint**: Config file updated
**Update brain**: "Step 1.5 complete - Capacitor configured"

### Step 1.6: Build and Test
```bash
npm run build
npx cap sync ios
npx cap open ios
```
In Xcode: Cmd+Shift+K → Play ▶️
**Checkpoint**: Default Vite app shows in simulator WITHOUT RELOAD LOOP
**Update brain**: "Step 1.6 complete - APP RUNS WITHOUT RELOAD!"

---

## PHASE 2: BASIC APP STRUCTURE (5 steps, ~20 min)

### Step 2.1: Create App Shell with Ionic Tabs
File: `src/App.tsx`
```tsx
import { IonApp, IonRouterOutlet, IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';
import { home, statsChart, document, settings } from 'ionicons/icons';

/* Core CSS required for Ionic components */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import './index.css';

// Pages (create these next)
import Dashboard from './pages/Dashboard';
import Progress from './pages/Progress';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';

setupIonicReact();

function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/login" component={Login} />
            <Route exact path="/dashboard" component={Dashboard} />
            <Route exact path="/progress" component={Progress} />
            <Route exact path="/reports" component={Reports} />
            <Route exact path="/settings" component={Settings} />
            <Route exact path="/">
              <Redirect to="/login" />
            </Route>
          </IonRouterOutlet>
          
          <IonTabBar slot="bottom">
            <IonTabButton tab="dashboard" href="/dashboard">
              <IonIcon icon={home} />
              <IonLabel>Class</IonLabel>
            </IonTabButton>
            <IonTabButton tab="progress" href="/progress">
              <IonIcon icon={statsChart} />
              <IonLabel>Progress</IonLabel>
            </IonTabButton>
            <IonTabButton tab="reports" href="/reports">
              <IonIcon icon={document} />
              <IonLabel>Reports</IonLabel>
            </IonTabButton>
            <IonTabButton tab="settings" href="/settings">
              <IonIcon icon={settings} />
              <IonLabel>Settings</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
}

export default App;
```
**Checkpoint**: App.tsx compiles without errors
**Update brain**: "Step 2.1 complete - App shell created"

### Step 2.2: Create Login Page
File: `src/pages/Login.tsx`
```tsx
import { IonContent, IonPage, IonButton, IonInput, IonItem, IonLabel } from '@ionic/react';
import { useState } from 'react';
import { useHistory } from 'react-router-dom';

export default function Login() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const history = useHistory();

  const handleLogin = () => {
    // For now, just store locally and redirect
    localStorage.setItem('montree_teacher', JSON.stringify({ name, id: 'local' }));
    history.push('/dashboard');
  };

  return (
    <IonPage>
      <IonContent className="ion-padding">
        <div className="flex flex-col items-center justify-center min-h-full">
          <span className="text-6xl mb-4">🌳</span>
          <h1 className="text-2xl font-bold mb-2">Montree</h1>
          <p className="text-gray-500 mb-8">Teacher Login</p>
          
          <div className="w-full max-w-sm space-y-4">
            <IonItem>
              <IonLabel position="floating">Your Name</IonLabel>
              <IonInput 
                value={name} 
                onIonChange={e => setName(e.detail.value || '')} 
              />
            </IonItem>
            
            <IonItem>
              <IonLabel position="floating">Password</IonLabel>
              <IonInput 
                type="password"
                value={password} 
                onIonChange={e => setPassword(e.detail.value || '')} 
              />
            </IonItem>
            
            <IonButton expand="block" onClick={handleLogin}>
              Login →
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
```
**Checkpoint**: Login page renders
**Update brain**: "Step 2.2 complete - Login page created"

### Step 2.3: Create Dashboard Page
File: `src/pages/Dashboard.tsx`
```tsx
import { IonContent, IonPage, IonHeader, IonToolbar, IonTitle } from '@ionic/react';

const students = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver'];
const colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const teacher = JSON.parse(localStorage.getItem('montree_teacher') || '{"name":"Teacher"}');

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>🐋 Whale Class</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p className="text-sm text-gray-500 mb-4">Welcome, {teacher.name}</p>
        
        <div className="grid grid-cols-3 gap-3">
          {students.map((name, i) => (
            <div key={name} className="bg-white rounded-xl p-4 text-center shadow">
              <div 
                className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: colors[i] }}
              >
                {name[0]}
              </div>
              <p className="text-sm">{name}</p>
            </div>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
}
```
**Checkpoint**: Dashboard shows student grid
**Update brain**: "Step 2.3 complete - Dashboard page created"

### Step 2.4: Create Placeholder Pages
File: `src/pages/Progress.tsx`
```tsx
import { IonContent, IonPage, IonHeader, IonToolbar, IonTitle } from '@ionic/react';

export default function Progress() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Progress</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>Progress tracking coming soon...</p>
      </IonContent>
    </IonPage>
  );
}
```

File: `src/pages/Reports.tsx`
```tsx
import { IonContent, IonPage, IonHeader, IonToolbar, IonTitle } from '@ionic/react';

export default function Reports() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Reports</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <p>Reports coming soon...</p>
      </IonContent>
    </IonPage>
  );
}
```

File: `src/pages/Settings.tsx`
```tsx
import { IonContent, IonPage, IonHeader, IonToolbar, IonTitle, IonButton } from '@ionic/react';
import { useHistory } from 'react-router-dom';

export default function Settings() {
  const history = useHistory();
  
  const handleLogout = () => {
    localStorage.removeItem('montree_teacher');
    history.push('/login');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonButton expand="block" color="danger" onClick={handleLogout}>
          Logout
        </IonButton>
      </IonContent>
    </IonPage>
  );
}
```
**Checkpoint**: All 4 pages exist and compile
**Update brain**: "Step 2.4 complete - All placeholder pages created"

### Step 2.5: Build and Test Navigation
```bash
npm run build
npx cap sync ios
npx cap open ios
```
In Xcode: Cmd+Shift+K → Play ▶️
**Checkpoint**: 
- App launches
- Login works
- Tab navigation works
- No reload loop
**Update brain**: "Step 2.5 complete - NAVIGATION WORKS!"

---

## PHASE 3: SQLITE DATABASE (Next session)

Will add:
- @capacitor-community/sqlite
- Database schema
- Repository layer
- Offline data storage

---

## CURRENT BRAIN.JSON STATE

After completing Phase 1 and 2, brain.json should look like:
```json
{
  "project": "Montree Mobile",
  "lastUpdated": "TIMESTAMP",
  "session": 95,
  "status": "PHASE 2 COMPLETE - APP RUNS",
  "lastCheckpoint": "Step 2.5 - Navigation works",
  "nextTask": "Phase 3 - SQLite setup"
}
```

---

## EMERGENCY RECOVERY

If you glitch or lose context:

1. **Check what exists**:
```bash
ls -la /Users/tredouxwillemse/Desktop/ACTIVE/montree-mobile
```

2. **Check brain.json**:
```bash
cat /Users/tredouxwillemse/Desktop/ACTIVE/montree-mobile/brain.json
```

3. **If project doesn't exist**: Start from Step 1.1

4. **If project exists but broken**: 
   - Read last checkpoint in brain.json
   - Resume from that step

5. **If project exists and works**:
   - Read brain.json for next task
   - Continue from there

---

## SUCCESS CRITERIA

The mobile app is DONE when:
- [ ] App launches without reload loop
- [ ] Teacher can login
- [ ] Dashboard shows students
- [ ] Can tap student → see progress
- [ ] Can update progress status
- [ ] Data persists offline (SQLite)
- [ ] Syncs when online (Supabase)
- [ ] Has native features (biometrics, camera)
- [ ] Passes App Store review

---

## FILES TO REFERENCE

- This handoff: `/Users/tredouxwillemse/Desktop/ACTIVE/whale/docs/HANDOFF_MONTREE_MOBILE.md`
- New project brain: `/Users/tredouxwillemse/Desktop/ACTIVE/montree-mobile/brain.json` (create during Step 1.1)
- Web app (reference): `/Users/tredouxwillemse/Desktop/ACTIVE/whale/`
