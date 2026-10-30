@echo off
rem AI OFFICE launcher build - uses the .NET Framework 4.x compiler that ships with Windows (nothing to install)
setlocal
cd /d "%~dp0"
set FW=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319
if not exist "%FW%\csc.exe" set FW=%WINDIR%\Microsoft.NET\Framework\v4.0.30319
"%FW%\csc.exe" /nologo /target:winexe /optimize+ /codepage:65001 /out:..\AI-OFFICE.exe /win32icon:icon.ico /resource:ui.xaml,ui.xaml /r:System.dll /r:System.Core.dll /r:System.Xaml.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll /r:System.Web.Extensions.dll /r:"%FW%\WPF\PresentationCore.dll" /r:"%FW%\WPF\PresentationFramework.dll" /r:"%FW%\WPF\WindowsBase.dll" Launcher.cs
if errorlevel 1 (
  echo BUILD FAILED
  exit /b 1
)
echo OK: %~dp0..\AI-OFFICE.exe
