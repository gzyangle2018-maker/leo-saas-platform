$r = Invoke-WebRequest -Uri 'https://c28d9d38.qoderwork-web.pages.dev' -UseBasicParsing
Write-Output ('Status: ' + $r.StatusCode)
$title = [regex]::Match($r.Content, '<title>(.*?)</title>').Groups[1].Value
Write-Output ('Title: ' + $title)
Write-Output ('Has root div: ' + $r.Content.Contains('id="root"'))
Write-Output ('Has script: ' + $r.Content.Contains('<script'))

# Check JS file
$jsUrl = 'https://c28d9d38.qoderwork-web.pages.dev/assets/index-CC9UhNbM.js'
$js = Invoke-WebRequest -Uri $jsUrl -UseBasicParsing
Write-Output ('JS Status: ' + $js.StatusCode)
Write-Output ('JS Size: ' + $js.Content.Length)
