${ErrorActionPreference = "Stop"}
$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendPath = Join-Path $repoRoot 'frontend'

$p = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run lint' -WorkingDirectory $frontendPath -NoNewWindow -Wait -PassThru
if ($p.ExitCode -ne 0) { exit $p.ExitCode }

$p = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run type-check' -WorkingDirectory $frontendPath -NoNewWindow -Wait -PassThru
exit $p.ExitCode
