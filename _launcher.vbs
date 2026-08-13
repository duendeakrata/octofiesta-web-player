' Starts the OctoFiesta Web Player static server in a hidden window.
' Usage: wscript _launcher.vbs "C:\path\to\project\"
Set sh = CreateObject("WScript.Shell")
cmd = "cmd /c cd /d """ & WScript.Arguments(0) & """ && node server.js 3000"
sh.Run cmd, 0, False
