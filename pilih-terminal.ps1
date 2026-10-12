$PREFIX  = 'web-'
$MAXNEW  = 2
$tmuxExe = 'C:\Users\WILIANTO\AppData\Local\Microsoft\WinGet\Packages\arndawg.tmux-windows_Microsoft.Winget.Source_8wekyb3d8bbwe\tmux.exe'
$psBase  = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"

function Get-Input {
    # Baca 1 baris dari stdin. Aman dipakai di mode pipe (ttyd) maupun console asli.
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { Write-Host '  [EOF] Sampai jumpa!' -ForegroundColor Gray; exit 0 }
    return $line.Trim()
}

function Get-Sessions {
    $list = & $tmuxExe ls -F '#{session_name}' 2>$null
    @($list) | Where-Object { $_ -like "$PREFIX*" }
}

function Get-WinCount($name) {
    $n = & $tmuxExe display-message -p '#{session_windows}' -t $name 2>$null
    if (-not $n) { return 1 }
    return [int]$n.Trim()
}

function Show-Menu($sessions) {
    try { Clear-Host } catch {}
    Write-Host '============================================' -ForegroundColor Cyan
    Write-Host '  TERMINAL ONLINE SD METHODIST-11' -ForegroundColor Cyan
    Write-Host '============================================' -ForegroundColor Cyan
    if ($sessions.Count -eq 0) {
        Write-Host ''
        Write-Host '  Belum ada sesi aktif.' -ForegroundColor Yellow
    } else {
        Write-Host ''
        Write-Host '  Sesi lama (pilih nomor untuk LANJUT):' -ForegroundColor Green
        for ($i = 0; $i -lt $sessions.Count; $i++) {
            $w = Get-WinCount $sessions[$i]
            Write-Host ("  {0}. {1}  ({2} window)" -f ($i + 1), $sessions[$i], $w)
        }
    }
    Write-Host ''
    Write-Host '  b. Buka terminal BARU' -ForegroundColor Green
    Write-Host '  t. Shell langsung (tanpa tmux)' -ForegroundColor Green
    Write-Host '  0. Keluar' -ForegroundColor Gray
}

function New-Session {
    param([string]$name)
    & $tmuxExe new-session -d -s $name -x 200 -y 50 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Attach-Session {
    param([string]$name)
    try {
        & $tmuxExe attach-session -t $name
    } catch {
        Write-Host '  tmux attach gagal - beralih ke shell langsung.' -ForegroundColor Red
        & $psBase -NoLogo -NoProfile
    }
}

while ($true) {
    $sessions = Get-Sessions
    Show-Menu $sessions
    $choice = Get-Input
    switch ($choice.ToLower()) {
        '0' { Write-Host 'Sampai jumpa!' -ForegroundColor Gray; exit 0 }
        't' { & $psBase -NoLogo -NoProfile }
        'b' {
            if ($sessions.Count -ge $MAXNEW) {
                Write-Host "  Max $MAXNEW sesi tercapai ($($sessions.Count) aktif)." -ForegroundColor Red
                [void](Get-Input)
                continue
            }
            $name = "$PREFIX" + ([DateTimeOffset]::Now.ToUnixTimeSeconds())
            if (New-Session $name) {
                Attach-Session $name
            } else {
                Write-Host '  Gagal membuat sesi baru.' -ForegroundColor Red
                [void](Get-Input)
            }
        }
        default {
            $n = 0
            if ([int]::TryParse($choice, [ref]$n) -and $n -ge 1 -and $n -le $sessions.Count) {
                Attach-Session $sessions[$n - 1]
            } else {
                Write-Host '  Pilihan tidak valid.' -ForegroundColor Red
                [void](Get-Input)
            }
        }
    }
}