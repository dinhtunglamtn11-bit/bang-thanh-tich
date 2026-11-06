# Máy chủ tĩnh nhỏ để xem thử app (không dùng khi đã đưa lên GitHub Pages).
param([int]$Port = 8080)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
$mime = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.svg'='image/svg+xml'; '.webmanifest'='application/manifest+json'; '.txt'='text/plain; charset=utf-8'; '.json'='application/json'; '.png'='image/png' }
while ($l.IsListening) {
  $c = $l.GetContext()
  try {
    $p = [Uri]::UnescapeDataString($c.Request.Url.AbsolutePath.TrimStart('/'))
    if ($p -eq '') { $p = 'index.html' }
    $f = Join-Path $root $p
    if ((Test-Path $f -PathType Leaf) -and ((Resolve-Path $f).Path.StartsWith($root))) {
      $b = [IO.File]::ReadAllBytes($f); $e = [IO.Path]::GetExtension($f).ToLower()
      $c.Response.ContentType = $(if ($mime.ContainsKey($e)) { $mime[$e] } else { 'application/octet-stream' })
      $c.Response.Headers.Add('Cache-Control','no-store')
      $c.Response.OutputStream.Write($b, 0, $b.Length)
    } else { $c.Response.StatusCode = 404 }
  } catch { $c.Response.StatusCode = 500 }
  $c.Response.Close()
}
