21:54:27.009 Running build in Washington, D.C., USA (East) – iad1
21:54:27.010 Build machine configuration: 2 cores, 8 GB
21:54:27.190 Cloning github.com/Tredoux555/whale-class (Branch: main, Commit: 3f91350)
21:54:28.617 Cloning completed: 1.425s
21:54:29.011 Restored build cache from previous deployment (4fuK6UmmxVzqRhq4XLjAxZP6phYR)
21:54:29.754 Running "vercel build"
21:54:30.168 Vercel CLI 50.0.1
21:54:30.576 Running "install" command: `npm install`...
21:54:33.203 
21:54:33.204 up to date, audited 753 packages in 2s
21:54:33.204 
21:54:33.205 172 packages are looking for funding
21:54:33.205   run `npm fund` for details
21:54:33.266 
21:54:33.267 3 vulnerabilities (1 moderate, 2 high)
21:54:33.267 
21:54:33.267 To address issues that do not require attention, run:
21:54:33.268   npm audit fix
21:54:33.268 
21:54:33.268 To address all issues, run:
21:54:33.268   npm audit fix --force
21:54:33.268 
21:54:33.268 Run `npm audit` for details.
21:54:33.315 Detected Next.js version: 16.0.7
21:54:33.317 Running "npm run build"
21:54:33.437 
21:54:33.438 > whale@0.1.3 build
21:54:33.438 > next build --webpack
21:54:33.438 
21:54:35.164    ▲ Next.js 16.0.7 (webpack)
21:54:35.165 
21:54:35.236    Creating an optimized production build ...
21:54:35.400 > [PWA] Compile server
21:54:35.401 > [PWA] Compile server
21:54:35.402 > [PWA] Compile client (static)
21:54:35.402 > [PWA] Auto register service worker with: /vercel/path0/node_modules/next-pwa/register.js
21:54:35.403 > [PWA] Service worker: /vercel/path0/public/sw.js
21:54:35.403 > [PWA]   url: /sw.js
21:54:35.403 > [PWA]   scope: /
21:54:46.757  ✓ Compiled successfully in 11.3s
21:54:46.762    Running TypeScript ...
21:54:58.391 Failed to compile.
21:54:58.392 
21:54:58.392 ./lib/curriculum/progression.ts:408:71
21:54:58.392 Type error: Parameter 'workId' implicitly has an 'any' type.
21:54:58.393 
21:54:58.393 [0m [90m 406 |[39m
21:54:58.393  [90m 407 |[39m     [90m// Count completed works in this stage[39m
21:54:58.393 [31m[1m>[22m[39m[90m 408 |[39m     [36mconst[39m completedWorksInStage [33m=[39m position[33m.[39mcompleted_work_ids[33m.[39mfilter((workId) [33m=>[39m {
21:54:58.393  [90m     |[39m                                                                       [31m[1m^[22m[39m
21:54:58.393  [90m 409 |[39m       [90m// Check if this work is in the current stage[39m
21:54:58.394  [90m 410 |[39m       [36mreturn[39m stageWorks[33m?[39m[33m.[39msome((w) [33m=>[39m w[33m.[39mid [33m===[39m workId)[33m;[39m
21:54:58.394  [90m 411 |[39m     })[33m.[39mlength[33m;[39m[0m
21:54:58.424 Next.js build worker exited with code: 1 and signal: null
21:54:58.474 Error: Command "npm run build" exited with 1