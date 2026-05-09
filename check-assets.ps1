$ErrorActionPreference = 'Stop'

try {
    $js = Invoke-WebRequest -Uri 'https://1c0bafb0.qoderwork-web.pages.dev/assets/index-CC9UhNbM.js' -UseBasicParsing
    Write-Output ('JS Status: ' + $js.StatusCode)
    Write-Output ('JS Size: ' + $js.Content.Length)
    Write-Output ('First 100 chars: ' + $js.Content.Substring(0, 100))
} catch {
    Write-Output ('JS Error: ' + $_.Exception.Message)
}

try {
    $css = Invoke-WebRequest -Uri 'https://1c0bafb0.qoderwork-web.pages.dev/assets/index-AbOAR-Fc.css' -UseBasicParsing
    Write-Output ('CSS Status: ' + $css.StatusCode)
    Write-Output ('CSS Size: ' + $css.Content.Length)
} catch {
    Write-Output ('CSS Error: ' + $_.Exception.Message)
}
