$urls = @(
    'https://qoderwork-web.pages.dev/assets/style.css',
    'https://qoderwork-web.pages.dev/js/app.jsx',
    'https://qoderwork-web.pages.dev/js/api.js',
    'https://qoderwork-web.pages.dev/js/router.js'
)

foreach ($url in $urls) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing
        Write-Output ("OK: " + $url + " -> " + $r.StatusCode + " (" + $r.Content.Length + " bytes)")
    } catch {
        Write-Output ("FAIL: " + $url + " -> " + $_.Exception.Message)
    }
}
