Push-Location "C:\Users\rofls\Documents\phpUploader\frontend"
npx cross-env PW_SLOWMO=100 PW_TRACE=on PW_VIDEO=on PW_SCREENSHOT=on playwright test tests-e2e/upload-and-download.spec.ts:9
Pop-Location