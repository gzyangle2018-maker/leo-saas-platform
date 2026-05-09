$content = (Invoke-WebRequest -Uri 'https://qoderwork-web.pages.dev' -UseBasicParsing).Content
Write-Output $content
