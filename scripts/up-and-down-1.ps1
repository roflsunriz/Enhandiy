${ErrorActionPreference = "Stop"}
$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendPath = Join-Path $repoRoot 'frontend'
$p = Start-Process -FilePath 'npx.cmd' -ArgumentList 'cross-env PW_SLOWMO=100 PW_TRACE=on PW_VIDEO=on PW_SCREENSHOT=on playwright test tests-e2e/upload-and-download.spec.ts:9' -WorkingDirectory $frontendPath -NoNewWindow -Wait -PassThru
exit $p.ExitCode
