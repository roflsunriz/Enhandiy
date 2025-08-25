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

if (-not $SkipUp) {
  Write-Host "Docker起動中..."
  docker compose -f $ComposeFilePath up -d
}

Write-Host "アプリ起動待ち: $BaseUrl"
if (-not (Wait-ForHttpOk -Url $BaseUrl -Timeout $TimeoutSec)) {
  Write-Error "起動待ちタイムアウト: $BaseUrl"
  docker compose -f $ComposeFilePath logs | Get-Content
  docker compose -f $ComposeFilePath down
  exit 1
}

Push-Location frontend
try {
  npm install
  $env:PLAYWRIGHT_BASE_URL = $BaseUrl
  # Docker内のconfig.phpからマスターキーを取得して環境変数に渡す
  try {
    # Here-String を使ってクォート崩れを防止し、bash -lc 経由で php を実行
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

  # フォールバック: ホストの backend/config/config.php から 'master' を正規表現で抽出
  if (-not $env:PW_MASTER_KEY) {
    try {
      $cfgPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'backend\config\config.php'
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
  npx playwright install chromium
  npx cross-env PW_SLOWMO=1200 PW_TRACE=on PW_VIDEO=on PW_SCREENSHOT=on playwright test
  $exitCode = $LASTEXITCODE
} finally {

}
exit $exitCode


