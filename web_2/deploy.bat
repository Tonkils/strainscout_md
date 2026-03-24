@echo off
cd /d C:\Users\jaretwyatt\.local\bin\strainscoutmd\strainscout_md
"C:\Users\jaretwyatt\AppData\Local\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\python.exe" -m publish.upload_ionos --next-incremental > web_2\deploy_output.txt 2>&1
echo Deploy exit code: %ERRORLEVEL% >> web_2\deploy_output.txt
