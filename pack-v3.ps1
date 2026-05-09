$tempDir = Join-Path $env:TEMP 'qw-deploy3'
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# 明确指定要复制的目录
$includeDirs = @('assets', 'js', 'functions')
$includeFiles = @('index.html')

foreach ($dir in $includeDirs) {
    $src = Join-Path (Get-Location) $dir
    $dst = Join-Path $tempDir $dir
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $dst -Recurse -Force
    }
}

foreach ($file in $includeFiles) {
    $src = Join-Path (Get-Location) $file
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $tempDir -Force
    }
}

# 验证 functions 目录
if (Test-Path (Join-Path $tempDir 'functions\[[path]].js')) {
    Write-Output "OK: functions/[[path]].js exists"
} else {
    Write-Output "ERROR: functions/[[path]].js NOT found"
}

$outputPath = "$env:USERPROFILE\Desktop\qoderwork-deploy-v3.zip"
Compress-Archive -Path "$tempDir\*" -DestinationPath $outputPath -Force
Remove-Item $tempDir -Recurse -Force
Write-Output "打包完成: $outputPath"
