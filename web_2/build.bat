@echo off
set PATH=C:\Program Files\nodejs;%PATH%
cd /d %~dp0
npx next build > build_output.txt 2>&1
echo Build exit code: %ERRORLEVEL% >> build_output.txt
