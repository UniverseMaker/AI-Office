' Starts the AI OFFICE backend with no console window. Safe to run repeatedly (single instance on port 17777).
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir
node = "node"
If fso.FileExists(sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe") Then node = """" & sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe"""
sh.Run node & " """ & dir & "\server\index.mjs""", 0, False
