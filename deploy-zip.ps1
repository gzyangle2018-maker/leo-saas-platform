# 打包部署脚本
$sourceDir = "C:\Users\21255\Desktop\QW工作空间\qoderwork-web"
$outputZip = "C:\Users\21255\Desktop\QW工作空间\qoderwork-web-deploy.zip"

# 排除 node_modules 和其他不需要的文件
$exclude = @('node_modules', '.git', '.qoderwork', '.vscode', '*.log', 'set-env.ps1', 'DEPLOY.md', 'worker.js', 'wrangler.toml', 'wrangler.jsonc')

# 获取所有需要打包的文件
$files = Get-ChildItem -Path $sourceDir -Recurse | Where-Object {
    $excludeItem = $false
    foreach ($ex in $exclude) {
        if ($_.FullName -like "*\$ex*" -or $_.FullName -like "*\$ex") {
            $excludeItem = $true
            break
        }
    }
    return -not $excludeItem -and -not $_.PSIsContainer
}

# 创建临时目录
$tempDir = Join-Path $env:TEMP "qoderwork-deploy-temp"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# 复制文件
foreach ($file in $files) {
    $relativePath = $file.FullName.Replace($sourceDir, '').TrimStart('\')
    $destPath = Join-Path $tempDir $relativePath
    $destDir = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Copy-Item $file.FullName -Destination $destPath -Force
}

# 打包
Compress-Archive -Path "$tempDir\*" -DestinationPath $outputZip -Force

# 清理临时目录
Remove-Item $tempDir -Recurse -Force

Write-Host "打包完成: $outputZip"
Write-Host "请在 Cloudflare Dashboard 中上传此 zip 文件"
