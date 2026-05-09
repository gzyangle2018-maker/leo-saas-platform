$r = Invoke-WebRequest -Uri 'https://qoderwork-web.pages.dev/js/app.jsx' -UseBasicParsing
Write-Output ("Status: " + $r.StatusCode)
Write-Output ("Content-Type: " + $r.Headers.'Content-Type')
Write-Output ("Content length: " + $r.Content.Length)
Write-Output ("First 300 chars:")
Write-Output $r.Content.Substring(0, [Math]::Min(300, $r.Content.Length))
