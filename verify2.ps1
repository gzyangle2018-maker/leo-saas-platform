$ErrorActionPreference = 'Stop'

try {
    $r = Invoke-WebRequest -Uri 'https://1c0bafb0.qoderwork-web.pages.dev' -UseBasicParsing
    Write-Output ('Status: ' + $r.StatusCode)
    $title = [regex]::Match($r.Content, '<title>(.*?)</title>').Groups[1].Value
    Write-Output ('Title: ' + $title)
} catch {
    Write-Output ('Error: ' + $_.Exception.Message)
}
