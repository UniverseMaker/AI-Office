# AI OFFICE backend auto-start at Windows logon (no window).
#   powershell -ExecutionPolicy Bypass -File autostart.ps1            # install + start now
#   powershell -ExecutionPolicy Bypass -File autostart.ps1 -Remove    # uninstall
param([switch]$Remove)
$startup = [Environment]::GetFolderPath('Startup')
$lnk = Join-Path $startup 'AI OFFICE.lnk'
$vbs = Join-Path $PSScriptRoot 'launch-hidden.vbs'

if ($Remove) {
  if (Test-Path -LiteralPath $lnk) { Remove-Item -LiteralPath $lnk -Force }
  Write-Output 'AI OFFICE 자동 시작을 해제했어요.'
  exit 0
}

$sh = New-Object -ComObject WScript.Shell
$s = $sh.CreateShortcut($lnk)
$s.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$s.Arguments = '"' + $vbs + '"'
$s.WorkingDirectory = $PSScriptRoot
$s.Description = 'AI OFFICE backend (http://127.0.0.1:17777)'
$s.Save()
& (Join-Path $env:WINDIR 'System32\wscript.exe') $vbs
Write-Output "등록 완료: $lnk"
