Push-Location "C:\Users\rofls\Documents\phpUploader\frontend"
try {
  if (Test-Path package-lock.json) {
    npm ci
  } else {
    npm install
  }
  npm run build
} finally {
  Pop-Location
}