$r = Invoke-WebRequest -Uri 'https://qoderwork-web.pages.dev/js/app.jsx' -UseBasicParsing
Write-Output $r.Content
