$tempDir = Join-Path $env:TEMP 'qw-deploy'
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

Get-ChildItem -Recurse | Where-Object {
    $_.FullName -notmatch 'node_modules' -and
    $_.FullName -notmatch '\\\.git'
} | ForEach-Object {
    if (-not $_.PSIsContainer) {
        $rel = $_.FullName.Replace((Get-Location).Path, '')
        $dest = Join-Path $tempDir $rel
        $d = Split-Path $dest -Parent
        if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
        Copy-Item $_.FullName $dest -Force
    }
}

Compress-Archive -Path "$tempDir\*" -DestinationPath "$env:USERPROFILE\Desktop\qoderwork-deploy.zip" -Force
Remove-Item $tempDir -Recurse -Force
Write-Host '打包完成: ' "$env:USERPROFILE\Desktop\qoderwork-deploy.zip"
