param(
  [string]$ComposeFilePath = "infrastructure\docker-compose.yaml",
  [string]$BaseUrl = "http://localhost",
  [int]$TimeoutSec = 120,
  [switch]$SkipUp = $false
)

$ErrorActionPreference = "Stop"

function Wait-ForHttpOk {
  param([string]$Url, [int]$Timeout)
  $deadline = (Get-Date).AddSeconds($Timeout)
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($resp.StatusCode -eq 200) { return $true }
    } catch { Start-Sleep -Seconds 2 }
  }
  return $false
}

$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not [System.IO.Path]::IsPathRooted($ComposeFilePath)) {
  $ComposeFilePath = Join-Path $repoRoot $ComposeFilePath
}

if (-not $SkipUp) {
  Write-Host "Starting Docker..."
  docker compose -f $ComposeFilePath up -d
}

Write-Host "Waiting for app: $BaseUrl"
if (-not (Wait-ForHttpOk -Url $BaseUrl -Timeout $TimeoutSec)) {
  Write-Error "Startup timeout: $BaseUrl"
  docker compose -f $ComposeFilePath logs | Get-Content
  docker compose -f $ComposeFilePath down
  exit 1
}

$frontendPath = Join-Path $repoRoot 'frontend'

# Install frontend deps without changing current directory
$p = Start-Process -FilePath 'npm.cmd' -ArgumentList 'install' -WorkingDirectory $frontendPath -NoNewWindow -Wait -PassThru
if ($p.ExitCode -ne 0) { exit $p.ExitCode }

$env:PLAYWRIGHT_BASE_URL = $BaseUrl

# Try to fetch master key from container
try {
  $phpInline = @"
php -r 'include "/var/www/html/backend/config/config.php"; $c=new config(); $cfg=$c->index(); echo $cfg["master"];'
"@
  $masterKey = (docker compose -f $ComposeFilePath exec -T php_apache bash -lc $phpInline) 2>$null
  if ($LASTEXITCODE -eq 0) {
    $masterKey = ($masterKey | Out-String).Trim()
    if ($masterKey -and $masterKey.Length -gt 0) {
      $env:PW_MASTER_KEY = $masterKey
    } else {
      Write-Warning "Master key not returned from container. Proceeding without PW_MASTER_KEY."
    }
  } else {
    Write-Warning "Failed to fetch master key from container. Proceeding without PW_MASTER_KEY."
  }
} catch {}

# Fallback: parse host config.php for 'master'
if (-not $env:PW_MASTER_KEY) {
  try {
    $cfgPath = Join-Path $repoRoot 'backend\config\config.php'
    if (Test-Path $cfgPath) {
      $content = Get-Content -Raw -LiteralPath $cfgPath
      $m = [regex]::Match($content, "'master'\s*=>\s*'([^']+)'")
      if ($m.Success) {
        $env:PW_MASTER_KEY = $m.Groups[1].Value
      } else {
        Write-Warning "Could not parse master key from $cfgPath"
      }
    }
  } catch {
    Write-Warning "Failed to read master key from host config.php"
  }
}

# Ensure Playwright is installed and run tests from frontend directory
$p = Start-Process -FilePath 'npx.cmd' -ArgumentList 'playwright install chromium' -WorkingDirectory $frontendPath -NoNewWindow -Wait -PassThru
if ($p.ExitCode -ne 0) { exit $p.ExitCode }

$p = Start-Process -FilePath 'npx.cmd' -ArgumentList 'cross-env PW_SLOWMO=1200 PW_TRACE=on PW_VIDEO=on PW_SCREENSHOT=on playwright test --grep-invert @cleanup' -WorkingDirectory $frontendPath -NoNewWindow -Wait -PassThru
exit $p.ExitCode

