!macro customUnInstall
  IfFileExists "$APPDATA\TermPilot\bin\uninstall-path.ps1" 0 termpilot_path_done
  ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$APPDATA\TermPilot\bin\uninstall-path.ps1"'
  termpilot_path_done:
!macroend
