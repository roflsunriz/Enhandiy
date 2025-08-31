${ErrorActionPreference = "Stop"}

$repoRoot = Split-Path -Parent $PSScriptRoot
$frontendPath = Join-Path $repoRoot 'frontend'

function Invoke-Cmd {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [Parameter(Mandatory=$true)][string]$ArgumentList,
    [Parameter(Mandatory=$true)][string]$WorkingDirectory
  )
  $p = Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -WorkingDirectory $WorkingDirectory -NoNewWindow -Wait -PassThru
  return $p.ExitCode
}

$exit = 0
if (Test-Path (Join-Path $frontendPath 'package-lock.json')) {
  $exit = Invoke-Cmd -FilePath 'npm.cmd' -ArgumentList 'ci' -WorkingDirectory $frontendPath
} else {
  $exit = Invoke-Cmd -FilePath 'npm.cmd' -ArgumentList 'install' -WorkingDirectory $frontendPath
}
if ($exit -ne 0) { exit $exit }

$exit = Invoke-Cmd -FilePath 'npm.cmd' -ArgumentList 'run build' -WorkingDirectory $frontendPath
exit $exit
