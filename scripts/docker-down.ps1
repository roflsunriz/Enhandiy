${ErrorActionPreference = "Stop"}
$repoRoot = Split-Path -Parent $PSScriptRoot
$composePath = Join-Path $repoRoot 'infrastructure\docker-compose.yaml'
docker-compose -f $composePath down
