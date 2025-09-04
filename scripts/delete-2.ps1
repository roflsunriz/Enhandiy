${ErrorActionPreference = "Stop"}
$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendPath = Join-Path $repoRoot 'frontend'
$p = Start-Process -FilePath 'npx.cmd' -ArgumentList 'cross-env PW_SLOWMO=1000 PW_TRACE=on PW_VIDEO=on PW_SCREENSHOT=on playwright test tests-e2e/delete.spec.ts:119' -WorkingDirectory $frontendPath -NoNewWindow -Wait -PassThru
exit $p.ExitCode
