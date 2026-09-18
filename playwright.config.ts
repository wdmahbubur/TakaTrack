import { defineConfig } from '@playwright/test';
const offline = process.env.TT_OFFLINE_UI === '1';
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
export default defineConfig({
  testDir: './tests/e2e', timeout: 45_000, expect: {timeout:10_000},
  fullyParallel: false, workers: 1, retries: process.env.CI ? 1 : 0,
  reporter: [['list'],['html',{open:'never'}],['json',{outputFile:'test-results/results.json'}]],
  outputDir: 'test-results/artifacts',
  use: { baseURL, browserName:'chromium', viewport:{width:1440,height:1024},
    locale:'en-GB',timezoneId:'Asia/Dhaka',reducedMotion:'reduce',
    trace:'off',screenshot:'only-on-failure',
    launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']},
  },
  webServer: process.env.E2E_EXTERNAL_SERVER === '1' ? undefined : [
    ...(offline?[{command:'node --experimental-strip-types tests/fixtures/offline-supabase.ts',url:'http://127.0.0.1:54321/health',reuseExistingServer:!process.env.CI,env:{TT_OFFLINE_UI:'1'}}]:[]),
    {command: process.env.E2E_PRODUCTION === '1'?`npm run start -- --port ${new URL(baseURL).port||3000}`:`npm run dev -- --port ${new URL(baseURL).port||3000}`,url:baseURL,reuseExistingServer:!process.env.CI,timeout:120_000,
      env: offline?{NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'offline-fixture-publishable-key',APP_ORIGIN:baseURL,GEMINI_API_KEY:'offline-test-placeholder',GOOGLE_OAUTH_ENABLED:'false'}:undefined},
  ],
});
