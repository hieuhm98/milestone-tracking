# Rebuilds public/downloads/todo-auth-app.zip from samples/todo-auth-app,
# leaving out node_modules, build output, local databases and .env.
# Run after changing the sample:  powershell -File scripts/pack-todo-sample.ps1

$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root "samples\todo-auth-app"
$stageRoot = Join-Path $env:TEMP "todo-sample-stage"
$stage = Join-Path $stageRoot "todo-auth-app"
$zip = Join-Path $root "public\downloads\todo-auth-app.zip"

if (Test-Path $stageRoot) { Remove-Item -Recurse -Force $stageRoot }

robocopy $src $stage /E /XD node_modules dist /XF *.db *.db-journal *.db-wal *.db-shm .env | Out-Null

New-Item -ItemType Directory -Force (Split-Path $zip) | Out-Null

if (Test-Path $zip) { Remove-Item $zip }

Compress-Archive -Path $stage -DestinationPath $zip
Remove-Item -Recurse -Force $stageRoot
Write-Output "Wrote $zip ($((Get-Item $zip).Length) bytes)"
