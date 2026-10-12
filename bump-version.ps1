$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

$files = Get-ChildItem -Path $Root -Recurse -Filter *.html
if (-not $files) { Write-Output "Tidak ada file HTML di $Root"; exit 1 }

# --- Bump versi footer (Versi 0.0002 -> Versi 0.0003) ---
$pattern = 'Versi\s+\d+\.\d{4}'
$current = $null
foreach ($f in $files) {
  $m = [regex]::Match((Get-Content -Path $f.FullName -Raw -Encoding UTF8), $pattern)
  if ($m.Success) { $current = $m.Value; break }
}
if (-not $current) { Write-Output "Versi tidak ditemukan di file HTML mana pun."; exit 1 }

$num = [regex]::Match($current, '(\d+)\.(\d{4})')
$major = [int]$num.Groups[1].Value
$minor = [int]$num.Groups[2].Value + 1
if ($minor -ge 10000) { $minor = 0; $major = $major + 1 }
$newVer = "Versi $major.$($minor.ToString('D4'))"

# --- Bump cache-buster CSS (style.css?v=11 -> style.css?v=12) ---
$cssPattern = 'style\.css\?v=(\d+)'
$cssVer = $null
foreach ($f in $files) {
  $m = [regex]::Match((Get-Content -Path $f.FullName -Raw -Encoding UTF8), $cssPattern)
  if ($m.Success) { $cssVer = [int]$m.Groups[1].Value; break }
}

$done = 0
$cssDone = 0
foreach ($f in $files) {
  $content = Get-Content -Path $f.FullName -Raw -Encoding UTF8
  if ($null -eq $content) { continue }
  $modified = $false
  if ($content.Contains($current)) {
    $content = $content.Replace($current, $newVer)
    $done++
    $modified = $true
  }
  if ($cssVer -and $content.Contains("style.css?v=$cssVer")) {
    $content = $content.Replace("style.css?v=$cssVer", "style.css?v=$($cssVer + 1)")
    $cssDone++
    $modified = $true
  }
  if ($modified) {
    Set-Content -Path $f.FullName -Value $content -Encoding UTF8 -NoNewline
  }
}

$out = "$current -> $newVer (di $done file)"
if ($cssVer) { $out += " | cache-buster $cssVer -> $($cssVer + 1) (di $cssDone file)" }
Write-Output $out
