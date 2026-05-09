$tempDir = Join-Path $env:TEMP 'qw-deploy2'
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

Get-ChildItem -Recurse | Where-Object {
    $_.FullName -notmatch 'node_modules' -and
    $_.FullName -notmatch '\\\.git' -and
    $_.Name -notmatch '\.ps1$' -and
    $_.Name -notmatch 'deploy-zip\.ps1' -and
    $_.Name -notmatch 'pack\.ps1' -and
    $_.Name -notmatch 'check-.*\.ps1' -and
    $_.Name -notmatch 'set-env\.ps1'
} | ForEach-Object {
    if (-not $_.PSIsContainer) {
        $rel = $_.FullName.Replace((Get-Location).Path, '')
        $dest = Join-Path $tempDir $rel
        $d = Split-Path $dest -Parent
        if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
        Copy-Item $_.FullName $dest -Force
    }
}

$outputPath = "$env:USERPROFILE\Desktop\qoderwork-deploy-v2.zip"
Compress-Archive -Path "$tempDir\*" -DestinationPath $outputPath -Force
Remove-Item $tempDir -Recurse -Force
Write-Output "打包完成: $outputPath"
