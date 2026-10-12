$ErrorActionPreference = 'Stop'
$ttydExe = Join-Path $env:LOCALAPPDATA 'opencode\tools\ttyd\ttyd.exe'
$siteDir = 'C:\Users\WILIANTO\memory\COMMON\project-sd-methodist-11'
$menuScript = Join-Path $siteDir 'pilih-terminal.ps1'
$logDir  = Join-Path $env:LOCALAPPDATA 'Temp\opencode'
$logFile = Join-Path $logDir 'ttyd-autostart.log'

function Write-Log($msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
    try { Add-Content -LiteralPath $logFile -Value $line -Encoding utf8 } catch {}
    Write-Output $line
}

$portOpen = Get-NetTCPConnection -LocalPort 7681 -State Listen -ErrorAction SilentlyContinue
if ($portOpen) {
    Write-Log "PELUANGAN_PORT_7681: sudah ada listener (PID $($portOpen.OwningProcess)), skip start."
    exit 0
}

if (-not (Test-Path -LiteralPath $ttydExe)) {
    Write-Log "ERROR: ttyd tidak ditemukan di $ttydExe"
    exit 1
}

if (-not (Test-Path -LiteralPath $menuScript)) {
    Write-Log "ERROR: pilih-terminal.ps1 tidak ditemukan di $menuScript"
    exit 1
}

try {
    $logOut = Join-Path $logDir 'ttyd.out.log'
    $logErr = Join-Path $logDir 'ttyd.err.log'
    $psPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
    $argList = "-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$menuScript`""
    $authFile = Join-Path $env:USERPROFILE '.config\opencode\secrets\ttyd-auth.txt'
    $ttydCred = ''
    if (Test-Path -LiteralPath $authFile) { $ttydCred = (Get-Content -LiteralPath $authFile -TotalCount 1).Trim() }
    $ttydArgs = @('-p','7681','-W','-b','/opencode')
    if ($ttydCred) { $ttydArgs += @('-c', $ttydCred) }
    $ttydArgs += @('-t','scrollback=20000','-t','scrollWithPage=true',$psPath,($argList -join ' '))
    $p = Start-Process -FilePath $ttydExe -ArgumentList $ttydArgs -WorkingDirectory $env:USERPROFILE -WindowStyle Hidden -RedirectStandardOutput $logOut -RedirectStandardError $logErr -PassThru
    if ($ttydCred) {
        Write-Log "SUKSES_LAUNCH: ttyd PID=$($p.Id) port 7681 path /opencode (menu pilih-terminal) basic-auth user='(kosong)' pass='**(disembunyikan)**' (file $authFile)"
    } else {
        Write-Log "PERINGATAN: ttyd PID=$($p.Id) TANPA basic-auth - file kredensial $authFile tidak ditemukan."
    }
} catch {
    Write-Log "ERROR_LAUNCH: $($_.Exception.Message)"
    exit 1
}

$ok = $false
for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Seconds 1
    $chk = Get-NetTCPConnection -LocalPort 7681 -State Listen -ErrorAction SilentlyContinue
    if ($chk) { $ok = $true; break }
}
if ($ok) {
    Write-Log "VERIFIKASI_PORT_7681: OK, listener aktif."
    exit 0
} else {
    Write-Log "VERIFIKASI_PORT_7681: GAGAL - port 7681 tidak mendengarkan setelah 10 detik."
    exit 1
}