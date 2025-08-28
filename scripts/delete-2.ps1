Push-Location "C:\Users\rofls\Documents\Enhandiy\frontend"
npx cross-env PW_SLOWMO=1000 PW_TRACE=on PW_VIDEO=on PW_SCREENSHOT=on playwright test tests-e2e/delete.spec.ts:110
Pop-Location