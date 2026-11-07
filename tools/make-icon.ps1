# Tạo icon.ico (ngôi sao pixel) và gắn vào shortcut trên Desktop
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$out = Join-Path $root 'icon.ico'

# Vẽ ngôi sao ở độ phân giải thấp 32x32 (không khử răng cưa) rồi phóng to kiểu pixel
$base = New-Object System.Drawing.Bitmap 32, 32
$g = [System.Drawing.Graphics]::FromImage($base)
$g.SmoothingMode = 'None'; $g.PixelOffsetMode = 'Half'
$g.Clear([System.Drawing.ColorTranslator]::FromHtml('#1a1c2c'))
$pts = @()
for ($i = 0; $i -lt 10; $i++) {
  $r = if ($i % 2 -eq 0) { 14.5 } else { 6.2 }
  $a = -[Math]::PI / 2 + $i * [Math]::PI / 5
  $pts += New-Object System.Drawing.PointF ([float](16 + $r * [Math]::Cos($a))), ([float](17.5 + $r * [Math]::Sin($a)))
}
$fill = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#ffcd75'))
$pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#ef7d57')), 1.6
$g.FillPolygon($fill, $pts); $g.DrawPolygon($pen, $pts)
$hi = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#fff1c9'))
$g.FillRectangle($hi, 13, 11, 3, 3); $g.FillRectangle($hi, 12, 14, 2, 2)
$g.Dispose()

function Get-Png($size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $gg = [System.Drawing.Graphics]::FromImage($bmp)
  $gg.InterpolationMode = 'NearestNeighbor'; $gg.PixelOffsetMode = 'Half'
  $gg.DrawImage($base, (New-Object System.Drawing.Rectangle 0, 0, $size, $size), 0, 0, 32, 32, 'Pixel')
  $gg.Dispose()
  $ms = New-Object IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
  , $ms.ToArray()
}
$sizes = 16, 32, 48, 256
$pngs = @(); foreach ($s in $sizes) { $pngs += , (Get-Png $s) }
$fs = [IO.File]::Create($out); $bw = New-Object IO.BinaryWriter $fs
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$sizes.Count)
$off = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
  $b = if ($sizes[$i] -ge 256) { 0 } else { $sizes[$i] }
  $bw.Write([byte]$b); $bw.Write([byte]$b); $bw.Write([byte]0); $bw.Write([byte]0)
  $bw.Write([uint16]1); $bw.Write([uint16]32); $bw.Write([uint32]$pngs[$i].Length); $bw.Write([uint32]$off)
  $off += $pngs[$i].Length
}
foreach ($p in $pngs) { $bw.Write($p) }
$bw.Close(); $fs.Close()

$lnk = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Bang Thanh Tich.lnk'
if (Test-Path $lnk) {
  $ws = New-Object -ComObject WScript.Shell
  $s = $ws.CreateShortcut($lnk); $s.IconLocation = "$out,0"; $s.Save()
  "Shortcut icon: " + $ws.CreateShortcut($lnk).IconLocation
}
"Created $out ($((Get-Item $out).Length) bytes)"

# Icon PNG cho tablet/điện thoại (Android cần 192/512, iPad/iPhone cần apple-touch-icon 180)
foreach ($pair in @(@(192, 'icon-192.png'), @(512, 'icon-512.png'), @(180, 'apple-touch-icon.png'))) {
  [IO.File]::WriteAllBytes((Join-Path $root $pair[1]), (Get-Png $pair[0]))
}
"Created PNG icons"
